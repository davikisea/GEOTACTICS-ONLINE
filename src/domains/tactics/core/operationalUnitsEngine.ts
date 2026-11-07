/**
 * ==============================================================================
 * MOTOR DE UNIDADES OPERACIONALES DESPLEGADAS EN MAPA (ZOOM x10 OPERACIONAL)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.2
 * Administra las unidades y convoyes visibles a escala operacional en el mapa.
 * Conforme a @tactical-command-intel y @indie-game-ui-architect.
 * ==============================================================================
 */

import type { FactionId } from '@domains/world';

export type OperationalUnitStatus = 'entrenched' | 'patrol' | 'moving' | 'in_combat' | 'guard';

export interface OperationalDeployedUnit {
  id: string;
  name: string;
  code: string;
  unitType: 'infantry' | 'mech' | 'recon' | 'tank' | 'md_tank' | 'heavy_tank' | 'artillery' | 'anti_air';
  clanId: string;
  clanTag: string;
  clanName: string;
  factionId: FactionId;
  location: [number, number]; // [lng, lat]
  hp: number; // 1-100
  maxHp: number; // 100
  status: OperationalUnitStatus;
  cityName?: string;
  facingAngle?: number; // Grados 0-360 para orientación
  lastActionAt: string;
}

export class OperationalUnitsEngine {
  private units: Map<string, OperationalDeployedUnit> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.seedDefaultOperationalUnits();
  }

  /**
   * Genera unidades desplegadas semilleras en las arterias y nodos urbanos reales
   */
  public seedDefaultOperationalUnits(): void {
    const seedList: OperationalDeployedUnit[] = [
      // ======================================================================
      // TEATRO CABIMAS (Costa Oriental del Lago de Maracaibo - Clan Ferro / Blue Moon)
      // ======================================================================
      {
        id: 'unit-op-cab-01',
        name: 'Vanguardia Acorazada T-72B',
        code: 'MD_TANK',
        unitType: 'md_tank',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        clanName: 'Legión Blindada Ferro',
        factionId: 'blue_moon',
        location: [-71.460, 10.405], // Av. Intercomunal c/ Carretera H
        hp: 95,
        maxHp: 100,
        status: 'patrol',
        cityName: 'Cabimas',
        facingAngle: 180,
        lastActionAt: new Date().toISOString(),
      },
      {
        id: 'unit-op-cab-02',
        name: 'Guarnición El Barroso II',
        code: 'MECH',
        unitType: 'mech',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        clanName: 'Legión Blindada Ferro',
        factionId: 'blue_moon',
        location: [-71.425, 10.370], // Carretera K, Sector Barroso
        hp: 100,
        maxHp: 100,
        status: 'entrenched',
        cityName: 'Cabimas',
        facingAngle: 90,
        lastActionAt: new Date().toISOString(),
      },
      {
        id: 'unit-op-cab-03',
        name: 'Batería de Artillería Costa Oriental',
        code: 'ARTILLERY',
        unitType: 'artillery',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        clanName: 'Legión Blindada Ferro',
        factionId: 'blue_moon',
        location: [-71.458, 10.395], // Terminal La Salina
        hp: 80,
        maxHp: 100,
        status: 'guard',
        cityName: 'Cabimas',
        facingAngle: 270,
        lastActionAt: new Date().toISOString(),
      },

      // ======================================================================
      // PUENTE GENERAL RAFAEL URDANETA (Estrecho de Maracaibo)
      // ======================================================================
      {
        id: 'unit-op-bridge-01',
        name: 'Convoy de Suministro Blindado',
        code: 'RECON',
        unitType: 'recon',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        clanName: 'Legión Blindada Ferro',
        factionId: 'blue_moon',
        location: [-71.550, 10.585], // Tramo central del Puente sobre el Lago
        hp: 100,
        maxHp: 100,
        status: 'moving',
        cityName: 'Maracaibo / Cabimas',
        facingAngle: 105,
        lastActionAt: new Date().toISOString(),
      },

      // ======================================================================
      // CARACAS (Distrito Capital - División Petroquímica Orinoco / Orange Star)
      // ======================================================================
      {
        id: 'unit-op-ccs-01',
        name: 'Guardia Pretoriana de Miraflores',
        code: 'HEAVY_TANK',
        unitType: 'heavy_tank',
        clanId: 'clan-orinoco',
        clanTag: 'ORNC',
        clanName: 'División Petroquímica Orinoco',
        factionId: 'orange_star',
        location: [-66.918, 10.505], // Av. Urdaneta / Miraflores
        hp: 100,
        maxHp: 100,
        status: 'entrenched',
        cityName: 'Caracas',
        facingAngle: 0,
        lastActionAt: new Date().toISOString(),
      },
      {
        id: 'unit-op-ccs-02',
        name: 'Patrulla Autopista Gran Cacique Guaicaipuro',
        code: 'RECON',
        unitType: 'recon',
        clanId: 'clan-orinoco',
        clanTag: 'ORNC',
        clanName: 'División Petroquímica Orinoco',
        factionId: 'orange_star',
        location: [-66.865, 10.490], // Autopista a la altura de La Carlota
        hp: 85,
        maxHp: 100,
        status: 'patrol',
        cityName: 'Caracas',
        facingAngle: 260,
        lastActionAt: new Date().toISOString(),
      },

      // ======================================================================
      // VALENCIA (Complejo Industrial Carabobo - Guardia Imperial Sol / Yellow Comet)
      // ======================================================================
      {
        id: 'unit-op-val-01',
        name: 'División Mecanizada Distribuidor San Blas',
        code: 'TANK',
        unitType: 'tank',
        clanId: 'clan-sol',
        clanTag: 'SOL',
        clanName: 'Guardia Imperial Sol',
        factionId: 'yellow_comet',
        location: [-67.995, 10.185], // Nudo vial San Blas
        hp: 90,
        maxHp: 100,
        status: 'guard',
        cityName: 'Valencia',
        facingAngle: 45,
        lastActionAt: new Date().toISOString(),
      },

      // ======================================================================
      // BARQUISIMETO (Nudo Logístico Lara - Vanguardia Selva Verde / Green Earth)
      // ======================================================================
      {
        id: 'unit-op-barq-01',
        name: 'Destacamento Antiaéreo Las Trinitarias',
        code: 'ANTI_AIR',
        unitType: 'anti_air',
        clanId: 'clan-selva',
        clanTag: 'SLVA',
        clanName: 'Vanguardia Selva Verde',
        factionId: 'green_earth',
        location: [-69.295, 10.075], // Este de Barquisimeto
        hp: 100,
        maxHp: 100,
        status: 'entrenched',
        cityName: 'Barquisimeto',
        facingAngle: 315,
        lastActionAt: new Date().toISOString(),
      },
    ];

    seedList.forEach((u) => this.units.set(u.id, u));
  }

  public getAllUnits(): OperationalDeployedUnit[] {
    return Array.from(this.units.values());
  }

  public getUnit(id: string): OperationalDeployedUnit | undefined {
    return this.units.get(id);
  }

  public deployUnit(unit: OperationalDeployedUnit): void {
    this.units.set(unit.id, unit);
    this.notify();
  }

  public removeUnit(id: string): boolean {
    const res = this.units.delete(id);
    if (res) this.notify();
    return res;
  }

  public updateUnitLocation(id: string, newLocation: [number, number]): boolean {
    const u = this.units.get(id);
    if (!u) return false;
    u.location = newLocation;
    u.lastActionAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Serializa las unidades a GeoJSON para MapLibre GL
   */
  public toGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
      type: 'FeatureCollection',
      features: Array.from(this.units.values()).map((u) => ({
        type: 'Feature',
        id: u.id,
        geometry: {
          type: 'Point',
          coordinates: u.location,
        },
        properties: {
          id: u.id,
          name: u.name,
          code: u.code,
          unitType: u.unitType,
          clanId: u.clanId,
          clanTag: u.clanTag,
          clanName: u.clanName,
          factionId: u.factionId,
          hp: u.hp,
          maxHp: u.maxHp,
          status: u.status,
          cityName: u.cityName || '',
          facingAngle: u.facingAngle || 0,
        },
      })),
    };
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}

export const operationalUnitsEngine = new OperationalUnitsEngine();