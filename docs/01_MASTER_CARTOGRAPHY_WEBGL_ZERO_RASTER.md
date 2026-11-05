# VOLUMEN 1: ARQUITECTURA CARTOGRÁFICA WEBGL 2.0 ZERO-RASTER
**Documento Canónico Unificado:** `01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md`  
**Proyecto:** *GEOTACTICS: ONLINE (Wars of Legacy)*  
**Versión:** 2.0.0-PROD (Zero-Raster & OpenPlace Bridge)  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `WARERA_MAP_ARCHITECTURE_DEEP_DIVE.md` (Arquitectura de alto rendimiento inspirada en WarEra)  
- `PLAN_IMPLEMENTACION_MAPA_VECTORIAL_ZERO_RASTER.md` (Especificación de pipeline vectorial)  
- `PLAN_DESPLIEGUE_MAPA_WEBGL_VENEZUELA.md` (Matriz de 24 Estados de Venezuela, 7 Buffers y Red Troncal)  

---

# 1. VISIÓN FUNDACIONAL: LA FÓRMULA ZERO-RASTER DE ALTO RENDIMIENTO

La mayoría de los juegos web de estrategia militar o geopolítica y las aplicaciones de mapas tradicionales cometen uno de estos dos errores críticos:
1. **Sobrecarga de Tiles Raster (PNG/JPG):** Descargar cientos de imágenes cuadradas (`{z}/{x}/{y}.png`) mediante peticiones HTTP concurrentes cada vez que el usuario hace pan o zoom. Esto satura el ancho de banda, genera parpadeos y consume decenas de megabytes de RAM.
2. **Sobrecarga de DOM/SVG:** Renderizar miles de nodos `<path>` o `<svg>` en el árbol del navegador. Cuando hay más de 500 regiones, cada evento de `mousemove` o cambio de color fuerza un *reflow* y *recalculation* de estilos en la CPU, derrumbando los FPS a menos de 15 FPS.

### La Solución Canónica de GEOTACTICS:
GEOTACTICS opera bajo una arquitectura **WebGL Vectorial Híbrida Zero-Raster** implementada sobre **MapLibre GL JS v6.16.0**:
- **Aislamiento de Red 100% Local:** Cero peticiones de red a servidores externos (`cartodb.com`, `mapbox.com`, `openstreetmap.org`). Cero API Keys comerciales.
- **Geometrías Vectoriales Servidas Localmente:** Masa continental (`/map/world_land.json`), teatro de operaciones (`/map/theatre_regions.json`) y red vial troncal (`/map/theatre_roads.json`).
- **Fondo Táctico Búnker:** Fondo de pantalla de vacío militar (`#0E100C`) con masas de tierra entintadas (`#1C1E17`) y bordes de camuflaje oliva (`#46521F`).
- **Worker Autónomo Desacoplado:** `public/maplibre-gl-worker.mjs` garantiza carga local inmediata con código 200 OK sin colapsos de CORS ni 504.
- **Picking Analítico WGS84 O(1):** Resolución instantánea de coordenadas geográficas a baldosas en $<0.001\text{ ms}$ (`coordinates.ts`).

---

# 2. ESPECIFICACIÓN DEL ESTILO CANÓNICO `ZERO_RASTER_MILITARY_STYLE`

El componente `src/components/world/TacticalWorldMap.tsx` consume la especificación de estilo vectorial nativa de MapLibre GL:

```typescript
export const ZERO_RASTER_MILITARY_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'world-land': {
      type: 'geojson',
      data: '/map/world_land.json',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0E100C' },
    },
    {
      id: 'world-land-mass',
      type: 'fill',
      source: 'world-land',
      paint: { 'fill-color': '#1C1E17', 'fill-opacity': 0.95 },
    },
    {
      id: 'world-land-border',
      type: 'line',
      source: 'world-land',
      paint: { 'line-color': '#46521F', 'line-width': 1.2, 'line-opacity': 0.65 },
    },
  ],
};
```

---

# 3. ESTRATIFICACIÓN EN GPU DE LA RED VIAL TRONCAL (VENEZUELA)

Las carreteras (`/map/theatre_roads.json`) se renderizan como una triple capa vectorial en la GPU con estética de novela gráfica militar:

1. **Sombra de Tinta Cómic (`roads-ink-shadow`):**  
   - Color: `#0A0B08`  
   - Ancho interpolado por zoom: `[4, 1.8, 8, 4.2, 14, 7.0]`  
   - Propósito: Separación visual de alto contraste sobre la masa continental.
2. **Resplandor Radar Militar (`roads-glow`):**  
   - Desenfoque: `line-blur: 2.0`  
   - Autopistas (`motorway`): Resplandor Verde CRT Fósforo (`#00FF66`).  
   - Troncales (`trunk` / `primary`): Resplandor Ámbar Táctico (`#F59E0B`).
3. **Núcleo de Precisión (`roads-core`):**  
   - Ancho fino nítido: `[4, 0.8, 8, 1.8, 14, 3.2]`  
   - Brillo vectorizado directo en el fragment shader.

> [!NOTE] NOTA DE OPTIMIZACIÓN EN CURSO
> La versión actual de `theatre_roads.json` (2.21 MB, 9,093 line features) se encuentra en proceso de reducción mediante simplificación Douglas-Peucker a $\le 95\text{ KB}$ para optimizar la carga en navegadores móviles.

---

# 4. MATRIZ DE COBERTURA: 24 ENTIDADES FEDERALES Y 7 ZONAS BUFFER

El teatro inicial de operaciones cubre la totalidad de la República de Venezuela y sus fronteras estratégicas:

| Código de Región | Entidad Federal / Zona | Capital / Nodo Estratégico | Bioma Táctico | Eje Vial / Troncal Primaria |
| :--- | :--- | :--- | :--- | :--- |
| `REG_VE_01` | **Distrito Capital** | Caracas (Ciudadela Nacional) | Urbano denso (`BIO-URB`) | Autopista Regional del Centro / T-01 / T-09 |
| `REG_VE_02` | **Zulia** | Maracaibo (Chokepoint Lacustre) | Planicie petrolera (`BIO-PLA`) | Troncal 3 / Troncal 6 / Puente sobre el Lago |
| `REG_VE_03` | **Bolívar** | Ciudad Guayana / Sidor | Tierras Altas / Minero (`BIO-HGH`) | Troncal 10 / Eje Fluvial Orinoco |
| `REG_VE_04` | **Anzoátegui** | Barcelona / Puerto La Cruz | Planicie petroquímica (`BIO-PLA`) | Troncal 9 / Troncal 16 |
| `REG_VE_05` | **Carabobo** | Valencia / Puerto Cabello | Urbano industrial / Puerto (`BIO-URB`) | Autopista del Centro / Troncal 1 / Puerto Marítimo |
| `REG_VE_06` | **Miranda** | Los Teques / Valles del Tuy | Planicie manufacturera (`BIO-PLA`) | Troncal 9 / Conexión Caracas |
| `REG_VE_07` | **Lara** | Barquisimeto | Nudo logístico ferroviario (`BIO-PLA`) | Troncal 1 / Troncal 4 / Troncal 17 |
| `REG_VE_08` | **Aragua** | Maracay | Base aeromilitar y blindados (`BIO-URB`) | Autopista Regional del Centro / T-02 |
| `REG_VE_09` | **Táchira** | San Cristóbal / San Antonio | Montaña andina (`BIO-HGH`) | Troncal 1 (Panamericana) / Frontera Cúcuta |
| `REG_VE_10` | **Falcón** | Coro / Punto Fijo (Amuay/Cardón) | Desértico / Costero (`BIO-DES`) | Troncal 3 / Troncal 4 |
| `REG_VE_11` | **Mérida** | Mérida / El Vigía | Alta montaña andina (`BIO-HGH`) | Troncal 7 (Trasandina) / T-01 |
| `REG_VE_12` | **Monagas** | Maturín | Sabana petrolera (`BIO-PLA`) | Troncal 10 / Troncal 13 |
| `REG_VE_13` | **Sucre** | Cumaná / Carúpano / Güiria | Costero marítimo (`BIO-ARC-ISL`) | Troncal 9 / Chokepoint Golfo de Paria |
| `REG_VE_14` | **Nueva Esparta** | Porlamar / La Asunción | Insular caribeño (`BIO-ARC-ISL`) | Ferry Marítimo Puerto La Cruz - Punta de Piedras |
| `REG_VE_15` | **Barinas** | Barinas | Llanos agrícolas y gas (`BIO-PLA`) | Troncal 5 (Eje Llanero) |
| `REG_VE_16` | **Portuguesa** | Acarigua / Guanare | Agroindustrial (`BIO-PLA`) | Troncal 5 / Autopista José Antonio Páez |
| `REG_VE_17` | **Guárico** | San Juan de los Morros / Calabozo | Corazón llanero (`BIO-PLA`) | Troncal 2 / Troncal 12 / Troncal 13 |
| `REG_VE_18` | **Trujillo** | Trujillo / Valera | Valle andino (`BIO-HGH`) | Troncal 1 / Troncal 7 |
| `REG_VE_19` | **Yaracuy** | San Felipe | Valle fértil minero (`BIO-PLA`) | Troncal 11 |
| `REG_VE_20` | **Apure** | San Fernando de Apure | Llanos bajos / Frontera fluvial (`BIO-PLA`) | Troncal 2 / Troncal 19 / Eje Río Apure |
| `REG_VE_21` | **Cojedes** | San Carlos | Enlace central llanero (`BIO-PLA`) | Troncal 5 |
| `REG_VE_22` | **Delta Amacuro**| Tucupita | Selva deltáica / Fluvial (`BIO-JGL`) | Vías fluviales Delta del Orinoco |
| `REG_VE_23` | **Amazonas** | Puerto Ayacucho | Selva profunda (`BIO-JGL`) | Troncal 12 / Eje Alto Orinoco |
| `REG_VE_24` | **Guayana Esequiba** | Tumeremo / Esequibo Occidental | Frontera y Selva Minera (`BIO-JGL`) | Troncal 10 / Zona en Reclamación |
| `BUF_CO_01..03` | **Buffers Colombia** | Cúcuta, Arauca, Maicao | Frontera Terrestre | Cruces Fronterizos Binacionales |
| `BUF_BR_01` | **Buffer Brasil** | Pacaraima / Roraima | Selva Fronteriza Sur | Troncal 10 Sur / BR-174 |
| `BUF_GY_01` | **Buffer Guyana** | Esequibo Oriental | Zona de Contacto | Corredores Atlánticos |
| `BUF_TT_01` | **Buffer Trinidad** | Boca de Serpiente | Canal Marítimo Oriental | Rutas Insulares Caribe |
| `BUF_CW_01` | **Buffer Antillas** | Curazao / Aruba | Fachada Caribe Norte | Corredor Marítimo Petrolero |

---

# 5. SEMANTIC LOD Y CICLO DE VIDA DE CÁMARA

1. **LOD 1 (Global / Estratégico, $z < 6.0$):**
   - Centroide Nacional de Venezuela: `[lng: -66.5897, lat: 6.4238]` a zoom `5.5`.
   - Polígonos de soberanía estadal con colores heráldicos de clan.
2. **LOD 2 (Operacional de Teatro, $6.0 \le z < 13.0$):**
   - Activación de carreteras troncales y autopistas.
   - Puntos de Control Territorial (TCP) y estados de asedio (`status === 'under_siege'`).
3. **LOD 3 (Táctico Local, $z \ge 13.0$):**
   - En el MVP Político (`v0.0.2-alfa`), el combate táctico en cuadrícula permanece deshabilitado en el mapa. Las operaciones se resuelven mediante asedio político directo y cálculo de atrición en el servidor.
