/**
 * ==============================================================================
 * SERVICIO DE UNIDADES OPERACIONALES DESPLEGADAS EN EL MAPA C4ISR
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.2
 * Gestiona tropas desplegadas visibles a partir de Zoom x10 en carreteras y frentes.
 * ==============================================================================
 */

export interface DeployedOperationalUnit {
  id: string;
  name: string;
  code: string;            // 'infantry' | 'recon' | 'md_tank' | 'artillery' | 'b_copter' | 'anti_air'
  clanId: string;
  clanTag: string;
  factionId: string;
  coordinates: [number, number]; // [lng, lat]
  hp: number;              // 1 - 100
  maxHp: number;           // 100
  tier: number;            // 1 - 5
  status: 'patrol' | 'holding' | 'in_transit' | 'combat';
  callsign: string;
  colorHex: string;
}

type UnitChangeListener = (units: DeployedOperationalUnit[]) => void;

class OperationalUnitsService {
  private units: Map<string, DeployedOperationalUnit> = new Map();
  private listeners: Set<UnitChangeListener> = new Set();

  constructor() {
    this.seedDefaultOperationalUnits();
  }

  private seedDefaultOperationalUnits() {
    const defaultUnits: DeployedOperationalUnit[] = [
      // 1. Cabimas: Eje Terminal La Salina
      {
        id: 'unit-cab-01',
        name: 'División Blindada Ferro A-1',
        code: 'md_tank',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        factionId: 'blue_moon',
        coordinates: [-71.458, 10.395],
        hp: 100,
        maxHp: 100,
        tier: 2,
        status: 'holding',
        callsign: 'FERRO-TITÁN-01',
        colorHex: '#1D4ED8', // Blue Moon
      },
      // 2. Cabimas: Intersección Av. Intercomunal con Carretera H
      {
        id: 'unit-cab-02',
        name: 'Patrulla Ligera de Reconocimiento',
        code: 'recon',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        factionId: 'blue_moon',
        coordinates: [-71.454, 10.405],
        hp: 85,
        maxHp: 100,
        tier: 1,
        status: 'patrol',
        callsign: 'HALCÓN-SALINA',
        colorHex: '#3B82F6',
      },
      // 3. Maracaibo: Cabecera Oriental Puente Sobre el Lago
      {
        id: 'unit-mcbo-01',
        name: 'Destacamento de Artillería Lago Urdaneta',
        code: 'artillery',
        clanId: 'clan-ferro',
        clanTag: 'FERR',
        factionId: 'blue_moon',
        coordinates: [-71.550, 10.580],
        hp: 90,
        maxHp: 100,
        tier: 2,
        status: 'holding',
        callsign: 'BATERÍA-URDANETA',
        colorHex: '#1D4ED8',
      },
      // 4. Caracas: Eje Av. Francisco de Miranda / La Carlota
      {
        id: 'unit-ccs-01',
        name: 'Guardia Mecanizada Capital Orinoco',
        code: 'md_tank',
        clanId: 'clan-orinoco',
        clanTag: 'ORNC',
        factionId: 'orange_star',
        coordinates: [-66.845, 10.490],
        hp: 100,
        maxHp: 100,
        tier: 3,
        status: 'holding',
        callsign: 'ORINOCO-VANGUARD-01',
        colorHex: '#E65100', // Orange Star
      },
      // 5. Valencia: Distribuidor Industrial San Blas
      {
        id: 'unit-val-01',
        name: 'Compañía Acorazada Sol Imperial',
        code: 'anti_air',
        clanId: 'clan-sol',
        clanTag: 'SOL',
        factionId: 'yellow_comet',
        coordinates: [-67.980, 10.180],
        hp: 95,
        maxHp: 100,
        tier: 2,
        status: 'patrol',
        callsign: 'COMETA-DEFENDER',
        colorHex: '#D97706', // Yellow Comet
      },
      // 6. Barquisimeto: Eje Av. Venezuela / Estación Central
      {
        id: 'unit-brq-01',
        name: 'Regimiento de Infantería Selva',
        code: 'infantry',
        clanId: 'clan-selva',
        clanTag: 'SLVA',
        factionId: 'green_earth',
        coordinates: [-69.320, 10.065],
        hp: 100,
        maxHp: 100,
        tier: 1,
        status: 'holding',
        callsign: 'GUARDIÁN-SELVA',
        colorHex: '#15803D', // Green Earth
      },
    ];

    defaultUnits.forEach((u) => this.units.set(u.id, u));
  }

  public getAllUnits(): DeployedOperationalUnit[] {
    return Array.from(this.units.values());
  }

  public getUnit(id: string): DeployedOperationalUnit | undefined {
    return this.units.get(id);
  }

  public deployUnit(unit: DeployedOperationalUnit): void {
    this.units.set(unit.id, unit);
    this.notifyListeners();
  }

  public removeUnit(id: string): void {
    this.units.delete(id);
    this.notifyListeners();
  }

  public toGeoJSON(): {
    type: 'FeatureCollection';
    features: any[];
  } {
    const features = Array.from(this.units.values()).map((u) => ({
      type: 'Feature',
      id: u.id,
      geometry: {
        type: 'Point',
        coordinates: u.coordinates,
      },
      properties: {
        id: u.id,
        name: u.name,
        code: u.code,
        clanId: u.clanId,
        clanTag: u.clanTag,
        factionId: u.factionId,
        hp: u.hp,
        maxHp: u.maxHp,
        tier: u.tier,
        status: u.status,
        callsign: u.callsign,
        colorHex: u.colorHex,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  public subscribe(listener: UnitChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const current = this.getAllUnits();
    this.listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (e) {
        console.error('[OperationalUnitsService] Error en suscriptor:', e);
      }
    });
  }
}

export const operationalUnitsService = new OperationalUnitsService();
