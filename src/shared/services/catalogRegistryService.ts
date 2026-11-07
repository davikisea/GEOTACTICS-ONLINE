/**
 * ==============================================================================
 * SERVICIO CENTRALIZADO DE CATÁLOGOS TÁCTICOS Y GOBERNANZA DE BALANCE (O(1))
 * ==============================================================================
 * Conforme a plan_catalog_ssot_synchronization.md
 * Garantiza:
 * 1. Acceso O(1) sincrónico (< 0.05 ms) para el motor de combate y pathfinding a 60 FPS.
 * 2. Hot-patching en caliente desde PostgreSQL sin recompilar el frontend.
 * 3. Fallback determinista y resiliencia total sin conexión (Offline-First).
 * ==============================================================================
 */

import {
  CATALOG_MANIFEST_METADATA,
  GENERATED_UNITS_CATALOG,
  GENERATED_TERRAINS_CATALOG,
  GENERATED_FIEF_BUILDINGS_CATALOG,
  GeneratedUnitSpec,
  GeneratedTerrainSpec,
  GeneratedFiefBuildingSpec,
} from '../data/catalogs.generated';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export type CatalogChangeListener = () => void;

class CatalogRegistryService {
  private unitsMap: Map<string, GeneratedUnitSpec> = new Map();
  private terrainsMap: Map<string, GeneratedTerrainSpec> = new Map();
  private fiefBuildingsMap: Map<string, GeneratedFiefBuildingSpec> = new Map();
  private damageMatrix: Map<string, number> = new Map();

  private activeVersionTag: string = CATALOG_MANIFEST_METADATA.versionTag;
  private activeContentHash: string = CATALOG_MANIFEST_METADATA.contentHash;
  private isHotPatched: boolean = false;
  private listeners: Set<CatalogChangeListener> = new Set();

  constructor() {
    this.hydrateFromStaticBaseline();
    this.restoreFromLocalCache();
  }

  /**
   * Carga el bundle estático precompilado como base canónica instantánea (0 ms).
   */
  private hydrateFromStaticBaseline(): void {
    Object.values(GENERATED_UNITS_CATALOG).forEach((u) => {
      this.unitsMap.set(u.id, { ...u });
    });

    Object.values(GENERATED_TERRAINS_CATALOG).forEach((t) => {
      this.terrainsMap.set(t.id, { ...t });
    });

    Object.values(GENERATED_FIEF_BUILDINGS_CATALOG).forEach((b) => {
      this.fiefBuildingsMap.set(b.type, { ...b });
    });

    this.seedDefaultDamageMatrix();
  }

  /**
   * Inicializa la matriz balística canónica de daño en memoria.
   */
  private seedDefaultDamageMatrix(): void {
    const defaultMatrix: Record<string, Record<string, number>> = {
      infantry: { infantry: 55, mech: 45, recon: 12, tank_light: 5, tank_medium: 1, artillery: 15, rocket: 25, anti_air: 5, b_copter: 7 },
      mech: { infantry: 65, mech: 55, recon: 85, tank_light: 55, tank_medium: 15, artillery: 70, rocket: 85, anti_air: 65, b_copter: 9 },
      recon: { infantry: 70, mech: 65, recon: 35, tank_light: 6, tank_medium: 1, artillery: 45, rocket: 55, anti_air: 4, b_copter: 12 },
      tank_light: { infantry: 75, mech: 70, recon: 85, tank_light: 55, tank_medium: 15, artillery: 70, rocket: 85, anti_air: 65, b_copter: 10 },
      tank_medium: { infantry: 105, mech: 95, recon: 105, tank_light: 85, tank_medium: 55, artillery: 105, rocket: 105, anti_air: 105, b_copter: 12 },
      artillery: { infantry: 90, mech: 85, recon: 80, tank_light: 70, tank_medium: 45, artillery: 75, rocket: 80, anti_air: 75, b_copter: 0 },
      rocket: { infantry: 95, mech: 90, recon: 90, tank_light: 80, tank_medium: 55, artillery: 80, rocket: 85, anti_air: 85, b_copter: 0 },
      anti_air: { infantry: 105, mech: 105, recon: 60, tank_light: 25, tank_medium: 10, artillery: 50, rocket: 55, anti_air: 45, b_copter: 120, fighter: 65, bomber: 75 },
      b_copter: { infantry: 75, mech: 75, recon: 55, tank_light: 55, tank_medium: 25, artillery: 65, rocket: 65, anti_air: 25, b_copter: 65 },
      fighter: { b_copter: 100, fighter: 55, bomber: 100 },
      bomber: { infantry: 110, mech: 110, recon: 105, tank_light: 105, tank_medium: 95, artillery: 105, rocket: 105, anti_air: 95 },
      battleship: { infantry: 95, mech: 90, recon: 90, tank_light: 80, tank_medium: 55, artillery: 80, rocket: 85, anti_air: 85 },
    };

    for (const [atk, defs] of Object.entries(defaultMatrix)) {
      for (const [def, dmg] of Object.entries(defs)) {
        this.damageMatrix.set(`${atk}_${def}`, dmg);
      }
    }
  }

  /**
   * Restaura parches dinámicos previos guardados en LocalStorage (si existen).
   */
  private restoreFromLocalCache(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const cachedHash = window.localStorage.getItem('tactical_catalog_hash');
      const cachedBundle = window.localStorage.getItem('tactical_catalog_bundle');

      if (cachedHash && cachedBundle && cachedHash !== CATALOG_MANIFEST_METADATA.contentHash) {
        const parsed = JSON.parse(cachedBundle);
        this.applyDynamicPatch(parsed, cachedHash);
        this.isHotPatched = true;
      }
    } catch (e) {
      console.warn('[CatalogRegistryService] Error restaurando cache local de catálogos:', e);
    }
  }

  /**
   * Sincroniza el catálogo con el manifiesto remoto en PostgreSQL.
   * Llamado de forma no bloqueante (< 300 ms) durante el Boot Screen.
   */
  public async synchronizeWithServer(): Promise<{ updated: boolean; versionTag: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { updated: false, versionTag: this.activeVersionTag };
    }

    try {
      // 1. Obtener encabezado ligero del manifiesto
      const { data: header, error: headerError } = await (supabase as any)
        .from('system_catalog_manifest')
        .select('version_tag, content_hash')
        .eq('id', 'current')
        .single();

      if (headerError || !header) {
        return { updated: false, versionTag: this.activeVersionTag };
      }

      // Si el hash coincide, no hay nada que descargar (304 Not Modified lógico)
      if (header.content_hash === this.activeContentHash) {
        return { updated: false, versionTag: this.activeVersionTag };
      }

      // 2. Hash diferente detectado: descargar bundle delta consolidado
      const { data: manifestRow, error: bundleError } = await (supabase as any)
        .from('system_catalog_manifest')
        .select('bundle_json, version_tag, content_hash')
        .eq('id', 'current')
        .single();

      if (bundleError || !manifestRow || !manifestRow.bundle_json) {
        return { updated: false, versionTag: this.activeVersionTag };
      }

      // 3. Aplicar parche en memoria y persistir en caché
      this.applyDynamicPatch(manifestRow.bundle_json, manifestRow.content_hash, manifestRow.version_tag);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('tactical_catalog_hash', manifestRow.content_hash);
        window.localStorage.setItem('tactical_catalog_bundle', JSON.stringify(manifestRow.bundle_json));
      }

      this.isHotPatched = true;
      this.notifyListeners();

      console.info(`[CatalogRegistryService] Catálogos actualizados en caliente: ${manifestRow.version_tag} (${manifestRow.content_hash.substring(0, 8)})`);
      return { updated: true, versionTag: manifestRow.version_tag };
    } catch (netErr) {
      console.warn('[CatalogRegistryService] Error de red al sincronizar manifiesto; operando en modo local:', netErr);
      return { updated: false, versionTag: this.activeVersionTag };
    }
  }

  /**
   * Aplica un parche dinámico de balance en memoria.
   */
  public applyDynamicPatch(bundle: any, newHash?: string, newVersion?: string): void {
    if (bundle.units) {
      const unitsList = Array.isArray(bundle.units)
        ? bundle.units
        : Object.entries(bundle.units).map(([id, val]: [string, any]) => ({ id, ...val }));

      unitsList.forEach((u: any) => {
        const existing = this.unitsMap.get(u.id);
        this.unitsMap.set(u.id, {
          id: u.id,
          name: u.display_name || u.name || existing?.name || u.id,
          category: u.category || existing?.category || 'infantry',
          productionCostG: u.production_cost_g ?? u.productionCostG ?? u.cost ?? existing?.productionCostG ?? 1000,
          hpMax: u.hp_max ?? u.hpMax ?? u.hp ?? existing?.hpMax ?? 100,
          baseAttack: u.base_attack ?? u.baseAttack ?? existing?.baseAttack ?? 55,
          movementPoints: u.movement_points ?? u.movementPoints ?? existing?.movementPoints ?? 3,
          movementType: u.movement_type || u.movementType || existing?.movementType || 'foot',
          visionRange: u.vision_range ?? u.visionRange ?? existing?.visionRange ?? 2,
          minRange: u.min_range ?? u.minRange ?? existing?.minRange ?? 1,
          maxRange: u.max_range ?? u.maxRange ?? existing?.maxRange ?? 1,
          fuelMax: u.fuel_max ?? u.fuelMax ?? existing?.fuelMax ?? 99,
          ammoMax: u.ammo_max ?? u.ammoMax ?? existing?.ammoMax ?? 0,
          weightClass: u.weight_class || u.weightClass || existing?.weightClass || 'standard',
          primaryWeaponName: u.primary_weapon_name || u.primaryWeaponName || existing?.primaryWeaponName,
          secondaryWeaponName: u.secondary_weapon_name || u.secondaryWeaponName || existing?.secondaryWeaponName,
        });
      });
    }

    if (bundle.terrains) {
      const terrainsList = Array.isArray(bundle.terrains)
        ? bundle.terrains
        : Object.entries(bundle.terrains).map(([id, val]: [string, any]) => ({ id, ...val }));

      terrainsList.forEach((t: any) => {
        const existing = this.terrainsMap.get(t.id);
        this.terrainsMap.set(t.id, {
          id: t.id,
          displayName: t.display_name || t.displayName || existing?.displayName || t.id,
          defenseStars: t.defense_stars ?? t.defenseStars ?? t.defenseBonus ?? existing?.defenseStars ?? 0,
          generatesFunds: t.generates_funds ?? t.generatesFunds ?? existing?.generatesFunds ?? 0,
          isCapturable: t.is_capturable ?? t.isCapturable ?? existing?.isCapturable ?? false,
          healsLand: t.heals_land ?? t.healsLand ?? existing?.healsLand ?? false,
          healsAir: t.heals_air ?? t.healsAir ?? existing?.healsAir ?? false,
          healsSea: t.heals_sea ?? t.healsSea ?? existing?.healsSea ?? false,
          moveCosts: {
            foot: t.move_cost_foot ?? t.moveCosts?.foot ?? existing?.moveCosts.foot,
            mech: t.move_cost_mech ?? t.moveCosts?.mech ?? existing?.moveCosts.mech,
            wheels: t.move_cost_wheels ?? t.moveCosts?.wheels ?? existing?.moveCosts.wheels,
            treads: t.move_cost_treads ?? t.moveCosts?.treads ?? existing?.moveCosts.treads,
            air: t.move_cost_air ?? t.moveCosts?.air ?? existing?.moveCosts.air,
            sea: t.move_cost_sea ?? t.moveCosts?.sea ?? existing?.moveCosts.sea,
          },
        });
      });
    }

    if (bundle.damage_matrix && Array.isArray(bundle.damage_matrix)) {
      bundle.damage_matrix.forEach((dm: any) => {
        const key = `${dm.attacker_unit_code}_${dm.defender_unit_code}`;
        this.damageMatrix.set(key, dm.base_damage);
      });
    }

    if (newHash) this.activeContentHash = newHash;
    if (newVersion) this.activeVersionTag = newVersion;
    this.isHotPatched = true;
    this.notifyListeners();
  }

  // ============================================================================
  // ACCESO O(1) SINCRÓNICO PARA EL MOTOR DE JUEGO (60 FPS)
  // ============================================================================

  public getUnitSpec(unitId: string): GeneratedUnitSpec {
    const unit = this.unitsMap.get(unitId);
    if (!unit) {
      return (
        GENERATED_UNITS_CATALOG['infantry'] || {
          id: unitId,
          name: unitId,
          category: 'infantry',
          productionCostG: 1000,
          hpMax: 100,
          baseAttack: 55,
          movementPoints: 3,
          movementType: 'foot',
          visionRange: 2,
          minRange: 1,
          maxRange: 1,
          fuelMax: 99,
          ammoMax: 0,
          weightClass: 'standard',
        }
      );
    }
    return unit;
  }

  public getAllUnits(): GeneratedUnitSpec[] {
    return Array.from(this.unitsMap.values());
  }

  /** Alias amigable para consultas directas del motor */
  public getUnit(unitId: string): GeneratedUnitSpec | undefined {
    return this.unitsMap.get(unitId);
  }

  public getTerrainSpec(terrainId: string): GeneratedTerrainSpec {
    const terrain = this.terrainsMap.get(terrainId);
    if (!terrain) {
      return (
        GENERATED_TERRAINS_CATALOG['plains'] || {
          id: terrainId,
          displayName: terrainId,
          defenseStars: 1,
          generatesFunds: 0,
          isCapturable: false,
          healsLand: false,
          healsAir: false,
          healsSea: false,
          moveCosts: { foot: 1, mech: 1, wheels: 2, treads: 1, air: 1 },
        }
      );
    }
    return terrain;
  }

  public getAllTerrains(): GeneratedTerrainSpec[] {
    return Array.from(this.terrainsMap.values());
  }

  /** Alias amigable para consultas directas del motor */
  public getTerrain(terrainId: string): GeneratedTerrainSpec | undefined {
    return this.terrainsMap.get(terrainId);
  }

  public getFiefBuildingSpec(type: string): GeneratedFiefBuildingSpec {
    const bld = this.fiefBuildingsMap.get(type);
    if (!bld) {
      return (
        GENERATED_FIEF_BUILDINGS_CATALOG['refinery'] || {
          type,
          name: type,
          initialCostEc: 10000,
          hourlyUpkeepEc: 200,
          maxHp: 8000,
          allowedTerrainDistMeters: 150,
          spriteName: 'factory',
          description: '',
        }
      );
    }
    return bld;
  }

  public getAllFiefBuildings(): GeneratedFiefBuildingSpec[] {
    return Array.from(this.fiefBuildingsMap.values());
  }

  /** Alias amigable para construcciones de feudo */
  public getBuilding(type: string): GeneratedFiefBuildingSpec | undefined {
    return this.fiefBuildingsMap.get(type);
  }

  /** Alias para listado de edificios */
  public getAllBuildings(): GeneratedFiefBuildingSpec[] {
    return this.getAllFiefBuildings();
  }

  public getWeaponDamage(attackerCode: string, defenderCode: string): number {
    return this.damageMatrix.get(`${attackerCode}_${defenderCode}`) ?? 10;
  }

  /** Alias para multiplicador de daño balístico */
  public getDamageMultiplier(attackerCode: string, defenderCode: string): number {
    return this.getWeaponDamage(attackerCode, defenderCode);
  }

  public getManifestVersion(): { versionTag: string; contentHash: string; isHotPatched: boolean } {
    return {
      versionTag: this.activeVersionTag,
      contentHash: this.activeContentHash,
      isHotPatched: this.isHotPatched,
    };
  }

  public subscribe(listener: CatalogChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Suscripción reactiva con paso del hash activo */
  public onReload(callback: (hash: string) => void): () => void {
    const listener = () => callback(this.activeContentHash);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('[CatalogRegistryService] Error en suscriptor:', e);
      }
    });
  }
}

export const catalogRegistry = new CatalogRegistryService();
