/**
 * ASSET LOADER & SPRITESHEET ENGINE (ADVANCE WARS TACTICAL)
 * 
 * Gestiona el ciclo de vida de los spritesheets, texturas de unidades,
 * animaciones por cuadros, precarga de assets críticos y carga diferida (lazy loading).
 * 
 * Incluye un rasterizador procedural de alta fidelidad estilo 16-bit militar
 * para garantizar funcionamiento offline y zero-latency en cualquier entorno web.
 */

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationClip {
  name: string;
  frameCount: number;
  frameDurationMs: number;
  loop: boolean;
  frames: FrameRect[];
}

export interface SpritesheetDefinition {
  id: string;
  unitCode: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, AnimationClip>;
}

export type AssetLoadingState = 'unloaded' | 'loading' | 'ready' | 'error';

export interface PreloadProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentAsset: string;
}

export interface DrawSpriteOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  team?: 'p1' | 'p2';
  skinId?: string;
  animation?: 'idle' | 'move' | 'attack' | 'explode' | 'capture';
  frameTimeMs?: number;
  rotationRad?: number;
  alpha?: number;
  flipX?: boolean;
}

class TacticalAssetLoader {
  private static instance: TacticalAssetLoader | null = null;

  // Cache de texturas de spritesheets reales extraídas de Advance Wars
  private realSprites: Map<string, HTMLCanvasElement> = new Map();
  private sheetsLoaded: Set<string> = new Set();
  private sheetsLoading: Map<string, Promise<boolean>> = new Map();

  // Cache de lienzos rasterizados procedurales para fallback
  private frameCache: Map<string, HTMLCanvasElement> = new Map();
  // Estado de carga por asset
  private assetStates: Map<string, AssetLoadingState> = new Map();

  // Mapeo canónico de unitCode a nombre de sprite y número de frames en spritesheet
  private static readonly UNIT_SPRITE_MAPPING: Record<string, { prefix: string; idleFrames: number; moveFrames: number }> = {
    infantry:    { prefix: 'infantry',     idleFrames: 4, moveFrames: 4 },
    mech:        { prefix: 'mech',         idleFrames: 2, moveFrames: 4 },
    recon:       { prefix: 'recon',        idleFrames: 4, moveFrames: 3 },
    tank_light:  { prefix: 'tank',         idleFrames: 4, moveFrames: 3 },
    tank_medium: { prefix: 'mediumTank',   idleFrames: 4, moveFrames: 3 },
    artillery:   { prefix: 'artillery',    idleFrames: 4, moveFrames: 3 },
    rocket:      { prefix: 'rocket',       idleFrames: 2, moveFrames: 3 },
    anti_air:    { prefix: 'antiAir',      idleFrames: 4, moveFrames: 3 },
    b_copter:    { prefix: 'battleCopter', idleFrames: 4, moveFrames: 2 },
    fighter:     { prefix: 'fighter',      idleFrames: 2, moveFrames: 3 },
    bomber:      { prefix: 'bomber',       idleFrames: 2, moveFrames: 3 },
    battleship:  { prefix: 'battleship',   idleFrames: 2, moveFrames: 2 },
  };

  // Lista de unidades críticas para la partida inicial
  private criticalUnits: string[] = [
    'infantry',
    'mech',
    'recon',
    'tank_light',
    'tank_medium',
    'artillery',
    'fx_explosion',
    'fx_muzzle',
    'fx_capture',
  ];
  // Unidades secundarias para Lazy Loading
  private lazyUnits: string[] = [
    'rocket',
    'anti_air',
    'b_copter',
    'fighter',
    'bomber',
    'battleship',
  ];

  private isPreloaded: boolean = false;
  private currentProgress: number = 0;

  private constructor() {
    // Inicializar estados
    [...this.criticalUnits, ...this.lazyUnits].forEach(code => {
      this.assetStates.set(code, 'unloaded');
    });
  }

  public static getInstance(): TacticalAssetLoader {
    if (!TacticalAssetLoader.instance) {
      TacticalAssetLoader.instance = new TacticalAssetLoader();
    }
    return TacticalAssetLoader.instance;
  }

  /**
   * Carga y procesa un atlas spritesheet TexturePacker (JSON + PNG)
   */
  public async loadSheet(sheetName: string): Promise<boolean> {
    if (this.sheetsLoaded.has(sheetName)) return true;
    if (this.sheetsLoading.has(sheetName)) {
      return await this.sheetsLoading.get(sheetName)!;
    }

    const promise = (async (): Promise<boolean> => {
      if (typeof window === 'undefined' || typeof Image === 'undefined') return false;

      try {
        const jsonUrl = `/assets/spritesheets/${sheetName}.json`;
        const imgUrl = `/assets/spritesheets/${sheetName}.png`;

        const res = await fetch(jsonUrl);
        if (!res.ok) {
          console.warn(`[TacticalAssetLoader] No se pudo obtener ${jsonUrl} (${res.status})`);
          return false;
        }
        const data = await res.json();

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Fallo al cargar imagen de atlas: ${imgUrl}`));
          img.src = imgUrl;
        });

        // Extraer y des-rotar cada fotograma del atlas
        const frames = data.frames || {};
        for (const [frameName, frameInfo] of Object.entries<any>(frames)) {
          const { x, y, w, h } = frameInfo.frame;
          const rotated = !!frameInfo.rotated;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.imageSmoothingEnabled = false;

          if (rotated) {
            // TexturePacker rota 90° antihorario en el atlas; para restaurar rotamos 90° horario (+PI/2)
            ctx.save();
            ctx.translate(w, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, x, y, h, w, 0, 0, h, w);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          }

          this.realSprites.set(`${sheetName}/${frameName}`, canvas);
        }

        this.sheetsLoaded.add(sheetName);
        return true;
      } catch (err) {
        console.warn(`[TacticalAssetLoader] Error procesando spritesheet ${sheetName}:`, err);
        return false;
      }
    })();

    this.sheetsLoading.set(sheetName, promise);
    const success = await promise;
    this.sheetsLoading.delete(sheetName);
    return success;
  }

  /**
   * Determina la facción / atlas correspondiente según equipo y skin táctica equipada
   */
  public getFactionSheet(team: 'p1' | 'p2', skinId: string = 'default'): string {
    const s = skinId.toLowerCase();
    if (s.includes('desert') || s.includes('yellow')) return 'yellow-comet';
    if (s.includes('woodland') || s.includes('urban') || s.includes('green')) return 'green-earth';
    if (s.includes('stealth') || s.includes('black') || s.includes('cyber')) return 'black-hole';
    if (s.includes('arctic') || s.includes('blue')) return 'blue-moon';
    return team === 'p1' ? 'orange-star' : 'blue-moon';
  }

  /**
   * Precarga de assets críticos: Atlas reales + fallbacks procedurales
   */
  public async preloadCriticalAssets(
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<void> {
    if (this.isPreloaded) {
      if (onProgress) {
        onProgress({
          total: 10,
          loaded: 10,
          percentage: 100,
          currentAsset: 'Sistemas Tácticos Listos',
        });
      }
      return;
    }

    const primarySheets = ['neutral', 'orange-star', 'blue-moon', 'icons', 'arrow'];
    const secondarySheets = ['green-earth', 'yellow-comet', 'black-hole'];
    const totalSteps = primarySheets.length + this.criticalUnits.length;
    let step = 0;

    // 1. Cargar Atlas de sprites de Advance Wars primarios
    for (const sheet of primarySheets) {
      if (onProgress) {
        onProgress({
          total: totalSteps,
          loaded: step,
          percentage: Math.round((step / totalSteps) * 100),
          currentAsset: `Cargando Atlas de Guerra: ${sheet.toUpperCase()}`,
        });
      }
      await this.loadSheet(sheet);
      step++;
    }

    // 2. Generar y almacenar en caché los fotogramas procedurales como fallback
    for (const unitCode of this.criticalUnits) {
      this.assetStates.set(unitCode, 'loading');

      if (onProgress) {
        onProgress({
          total: totalSteps,
          loaded: step,
          percentage: Math.round((step / totalSteps) * 100),
          currentAsset: `Optimizando matriz táctica: ${unitCode.toUpperCase()}`,
        });
      }

      await this.generateUnitSprites(unitCode);
      this.assetStates.set(unitCode, 'ready');
      step++;
    }

    // 3. Cargar en diferido las facciones secundarias (skins de tienda)
    setTimeout(() => {
      secondarySheets.forEach(s => this.loadSheet(s));
    }, 50);

    this.isPreloaded = true;
    this.currentProgress = 100;

    if (onProgress) {
      onProgress({
        total: totalSteps,
        loaded: totalSteps,
        percentage: 100,
        currentAsset: 'Despliegue Táctico Completo',
      });
    }
  }

  /**
   * Lazy loading de unidades especializadas
   */
  public async loadLazyAsset(unitCode: string): Promise<boolean> {
    const currentState = this.assetStates.get(unitCode);
    if (currentState === 'ready') return true;
    if (currentState === 'loading') return false;

    this.assetStates.set(unitCode, 'loading');
    try {
      await this.generateUnitSprites(unitCode);
      this.assetStates.set(unitCode, 'ready');
      return true;
    } catch {
      this.assetStates.set(unitCode, 'error');
      return false;
    }
  }

  public isAssetReady(unitCode: string): boolean {
    return this.assetStates.get(unitCode) === 'ready' || this.sheetsLoaded.has('orange-star');
  }

  public getOverallProgress(): number {
    return this.currentProgress;
  }

  /**
   * Obtiene el sprite real de unidad desde el atlas de la facción correspondiente
   */
  public getRealUnitSprite(
    unitCode: string,
    animation: string = 'idle',
    frameTimeMs: number = 0,
    team: 'p1' | 'p2' = 'p1',
    skinId: string = 'default'
  ): HTMLCanvasElement | null {
    const mapping = TacticalAssetLoader.UNIT_SPRITE_MAPPING[unitCode];
    if (!mapping) return null;

    const sheet = this.getFactionSheet(team, skinId);
    let frameName = '';

    if (animation === 'move') {
      const idx = Math.floor(frameTimeMs / 180) % mapping.moveFrames;
      frameName = `${mapping.prefix}-mdown-${idx}.png`;
      const sprite = this.realSprites.get(`${sheet}/${frameName}`);
      if (sprite) return sprite;
    }

    // Animación de reposo (idle)
    const idx = Math.floor(frameTimeMs / 200) % mapping.idleFrames;
    frameName = `${mapping.prefix}-${idx}.png`;
    return this.realSprites.get(`${sheet}/${frameName}`) || null;
  }

  /**
   * Dibuja una celda de terreno con autotiling y edificios de facción animados
   */
  public drawTerrainTile(
    ctx: CanvasRenderingContext2D,
    tile: { type: string; x: number; y: number; ownerId?: string | null },
    px: number,
    py: number,
    size: number = 48,
    tiles?: Array<Array<{ type: string }>>,
    timestamp: number = 0
  ): boolean {
    // Si aún no cargó el atlas neutral, indicar que use fallback
    if (!this.sheetsLoaded.has('neutral')) {
      return false;
    }

    // 1. Océano
    if (tile.type === 'sea') {
      const seaSprite = this.realSprites.get('neutral/sea.png');
      if (seaSprite) {
        ctx.drawImage(seaSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 2. Arrecife y Playas
    if (tile.type === 'reef') {
      const seaSprite = this.realSprites.get('neutral/sea.png');
      const reefSprite = this.realSprites.get('neutral/reef.png');
      if (seaSprite) ctx.drawImage(seaSprite, px, py, size, size);
      if (reefSprite) ctx.drawImage(reefSprite, px, py, size, size);
      return !!reefSprite;
    }

    if (tile.type === 'shoal') {
      const shoalSprite = this.realSprites.get('neutral/shoal.png');
      if (shoalSprite) {
        ctx.drawImage(shoalSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 3. Llanura de fondo base
    const basePlain = this.realSprites.get('neutral/plain-normal.png') || this.realSprites.get('neutral/plain.png');
    if (basePlain) {
      ctx.drawImage(basePlain, px, py, size, size);
    }

    if (tile.type === 'plains') {
      return !!basePlain;
    }

    // 4. Bosque
    if (tile.type === 'forest') {
      const forestSprite = this.realSprites.get('neutral/forest.png');
      if (forestSprite) {
        ctx.drawImage(forestSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 5. Montaña
    if (tile.type === 'mountain') {
      const mountainSprite = this.realSprites.get('neutral/mountain.png');
      if (mountainSprite) {
        ctx.drawImage(mountainSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 6. Carreteras con autotiling de conexiones
    if (tile.type === 'road') {
      const roadSprite = this.getConnectedRoadSprite(tile.x, tile.y, tiles);
      if (roadSprite) {
        ctx.drawImage(roadSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 7. Ríos con autotiling de curvas y cruces
    if (tile.type === 'river') {
      const riverSprite = this.getConnectedRiverSprite(tile.x, tile.y, tiles);
      if (riverSprite) {
        ctx.drawImage(riverSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 7b. Puentes (Cruces de agua)
    if (tile.type === 'bridge') {
      const left = tiles[tile.y]?.[tile.x - 1];
      const right = tiles[tile.y]?.[tile.x + 1];
      const isHorizontal =
        (left && (left.type === 'road' || left.type === 'bridge' || left.type === 'plains')) ||
        (right && (right.type === 'road' || right.type === 'bridge' || right.type === 'plains'));
      const bridgeSprite = isHorizontal
        ? (this.realSprites.get('neutral/bridge-right-left.png') || this.realSprites.get('neutral/bridge-top-bottom.png'))
        : (this.realSprites.get('neutral/bridge-top-bottom.png') || this.realSprites.get('neutral/bridge-right-left.png'));
      if (bridgeSprite) {
        ctx.drawImage(bridgeSprite, px, py, size, size);
        return true;
      }
      return false;
    }

    // 8. Propiedades, Ciudades y Cuarteles Generales
    const owner = tile.ownerId;
    const isP1 = owner === 'p1' || owner === 'player1';
    const isP2 = owner === 'p2' || owner === 'player2';
    const faction = isP1 ? 'orange-star' : isP2 ? 'blue-moon' : 'neutral';

    let buildingSprite: HTMLCanvasElement | undefined;
    const anim3 = Math.floor(timestamp / 250) % 3;
    const anim6 = Math.floor(timestamp / 200) % 6;

    if (tile.type === 'city') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/city-0.png')
        : this.realSprites.get(`${faction}/city-${anim3}.png`);
    } else if (tile.type === 'factory') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/base-0.png')
        : this.realSprites.get(`${faction}/base-${anim6}.png`);
    } else if (tile.type === 'airport') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/airport-0.png')
        : this.realSprites.get(`${faction}/airport-${anim3}.png`);
    } else if (tile.type === 'port') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/port-0.png')
        : this.realSprites.get(`${faction}/port-${anim3}.png`);
    } else if (tile.type === 'hq') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/city-0.png')
        : this.realSprites.get(`${faction}/hq-${anim3}.png`);
    } else if (tile.type === 'commtower') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/commtower-0.png')
        : (this.realSprites.get(`${faction}/commtower-${anim3}.png`) || this.realSprites.get('neutral/commtower-0.png'));
    } else if (tile.type === 'lab') {
      buildingSprite = faction === 'neutral'
        ? this.realSprites.get('neutral/lab-0.png')
        : (this.realSprites.get(`${faction}/lab-${anim3}.png`) || this.realSprites.get('neutral/lab-0.png'));
    } else if (tile.type === 'silo') {
      buildingSprite = this.realSprites.get('neutral/unusedSilo.png') || this.realSprites.get('neutral/silo-neutral-neutral-0.png');
    } else if (tile.type === 'pipe') {
      buildingSprite = this.realSprites.get('neutral/pipe-right-left.png') || this.realSprites.get('neutral/pipe-top-bottom.png');
    }

    if (buildingSprite) {
      ctx.drawImage(buildingSprite, px, py, size, size);
      return true;
    }

    return !!basePlain;
  }

  private getConnectedRoadSprite(x: number, y: number, tiles?: Array<Array<{ type: string }>>): HTMLCanvasElement | null {
    if (!tiles) return this.realSprites.get('neutral/road-right-left.png') || null;

    const connects = (gx: number, gy: number) => {
      const t = tiles[gy]?.[gx]?.type;
      return t === 'road' || t === 'city' || t === 'factory' || t === 'hq' || t === 'airport' || t === 'port';
    };

    const up = connects(x, y - 1);
    const down = connects(x, y + 1);
    const left = connects(x - 1, y);
    const right = connects(x + 1, y);

    let name = 'road-right-left.png';
    if (up && down && left && right) name = 'road-top-right-bottom-left.png';
    else if (up && right && down) name = 'road-top-right-bottom.png';
    else if (up && down && left) name = 'road-top-bottom-left.png';
    else if (up && right && left) name = 'road-top-right-left.png';
    else if (right && down && left) name = 'road-right-bottom-left.png';
    else if (up && right) name = 'road-top-right.png';
    else if (up && left) name = 'road-top-left.png';
    else if (down && right) name = 'road-right-bottom.png';
    else if (down && left) name = 'road-bottom-left.png';
    else if (up || down) name = 'road-top-bottom.png';
    else name = 'road-right-left.png';

    return this.realSprites.get(`neutral/${name}`) || this.realSprites.get('neutral/road-right-left.png') || null;
  }

  private getConnectedRiverSprite(x: number, y: number, tiles?: Array<Array<{ type: string }>>): HTMLCanvasElement | null {
    if (!tiles) return this.realSprites.get('neutral/river-right-left.png') || null;

    const connects = (gx: number, gy: number) => {
      const t = tiles[gy]?.[gx]?.type;
      return t === 'river' || t === 'sea';
    };

    const up = connects(x, y - 1);
    const down = connects(x, y + 1);
    const left = connects(x - 1, y);
    const right = connects(x + 1, y);

    let name = 'river-right-left.png';
    if (up && down && left && right) name = 'river-top-right-bottom-left.png';
    else if (up && right && down) name = 'river-top-right-bottom.png';
    else if (up && down && left) name = 'river-top-bottom-left.png';
    else if (up && right && left) name = 'river-top-right-left.png';
    else if (right && down && left) name = 'river-right-bottom-left.png';
    else if (up && right) name = 'river-top-right.png';
    else if (up && left) name = 'river-top-left.png';
    else if (down && right) name = 'river-right-bottom.png';
    else if (down && left) name = 'river-bottom-left.png';
    else if (up || down) name = 'river-top-bottom.png';
    else name = 'river-right-left.png';

    return this.realSprites.get(`neutral/${name}`) || this.realSprites.get('neutral/river-right-left.png') || null;
  }

  /**
   * Obtiene o genera el fotograma exacto para renderizar en el canvas principal
   */
  public getFrame(
    unitCode: string,
    animation: string = 'idle',
    frameIdx: number = 0,
    team: 'p1' | 'p2' = 'p1',
    skinId: string = 'default'
  ): HTMLCanvasElement | null {
    // Intentar primero con el sprite real del atlas
    const realSprite = this.getRealUnitSprite(unitCode, animation, frameIdx * 200, team, skinId);
    if (realSprite) return realSprite;

    // Normalizar frame index a ciclo de 4 fotogramas para fallback procedural
    const safeFrame = Math.floor(Math.abs(frameIdx)) % 4;
    const cacheKey = `${unitCode}_${team}_${skinId}_${animation}_${safeFrame}`;

    if (this.frameCache.has(cacheKey)) {
      return this.frameCache.get(cacheKey)!;
    }

    const canvas = this.renderSingleFrame(unitCode, animation, safeFrame, team, skinId);
    this.frameCache.set(cacheKey, canvas);
    return canvas;
  }

  /**
   * Dibuja un sprite animado directamente en el contexto del canvas
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    unitCode: string,
    options: DrawSpriteOptions
  ): void {
    const {
      x,
      y,
      width = 48,
      height = 48,
      team = 'p1',
      skinId = 'default',
      animation = 'idle',
      frameTimeMs = 0,
      rotationRad = 0,
      alpha = 1.0,
      flipX = false,
    } = options;

    // Intentar obtener el sprite real del atlas de Advance Wars
    const realSprite = this.getRealUnitSprite(unitCode, animation, frameTimeMs, team, skinId);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.translate(x + width / 2, y + height / 2);

    if (rotationRad !== 0) {
      ctx.rotate(rotationRad);
    }
    if (flipX) {
      ctx.scale(-1, 1);
    }

    if (realSprite) {
      // Dibujar sprite real centrado
      ctx.drawImage(realSprite, -width / 2, -height / 2, width, height);
    } else {
      // Fallback procedural ultra-rápido
      const frameIdx = Math.floor(frameTimeMs / 200) % 4;
      const frameCanvas = this.getFrame(unitCode, animation, frameIdx, team, skinId);
      if (frameCanvas) {
        ctx.drawImage(frameCanvas, -width / 2, -height / 2, width, height);
      }
    }

    ctx.restore();
  }

  /**
   * Dibuja una animación de explosión o impacto de combate en el canvas
   */
  public drawExplosion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number, // 0.0 a 1.0
    size: number = 48
  ): void {
    const frameIdx = Math.min(5, Math.floor(progress * 6));
    const cacheKey = `fx_explosion_${frameIdx}`;
    let frame = this.frameCache.get(cacheKey);

    if (!frame) {
      frame = this.renderExplosionFrame(frameIdx);
      this.frameCache.set(cacheKey, frame);
    }

    ctx.save();
    ctx.drawImage(frame, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  // =========================================================================
  // RASTERIZADOR PROCEDURAL DE ALTA PRECISIÓN (PIXEL-ART MILITAR TÁCTICO)
  // =========================================================================

  private async generateUnitSprites(unitCode: string): Promise<void> {
    const teams: Array<'p1' | 'p2'> = ['p1', 'p2'];
    const animations = ['idle', 'move', 'attack'];
    const skins = ['default', 'woodland', 'desert', 'stealth_ops'];

    // Pre-rasterizar variaciones clave
    for (const team of teams) {
      for (const skin of skins) {
        for (const anim of animations) {
          for (let frame = 0; frame < 4; frame++) {
            const key = `${unitCode}_${team}_${skin}_${anim}_${frame}`;
            if (!this.frameCache.has(key)) {
              const canvas = this.renderSingleFrame(unitCode, anim, frame, team, skin);
              this.frameCache.set(key, canvas);
            }
          }
        }
      }
    }
  }

  private renderSingleFrame(
    unitCode: string,
    animation: string,
    frame: number,
    team: 'p1' | 'p2',
    skinId: string
  ): HTMLCanvasElement {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Desactivar suavizado para estética pixel-art 16-bit nítida
    ctx.imageSmoothingEnabled = false;

    // Obtener paleta de colores tácticos para la unidad
    const palette = this.getColorPalette(team, skinId);

    // Ajustes de animación (offset de respiración/paso)
    const bobOffset = animation === 'idle' ? (frame % 2 === 0 ? 0 : -1) : 0;
    const stepOffset = animation === 'move' ? (frame % 2 === 0 ? 1 : -1) : 0;
    const recoilOffset = animation === 'attack' ? (frame === 1 ? -3 : frame === 2 ? -1 : 0) : 0;

    ctx.save();
    ctx.translate(0, bobOffset + stepOffset);

    // Sombra proyectada en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(24, 38, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dibujar unidad según su código táctico
    switch (unitCode) {
      case 'infantry':
        this.drawInfantrySprite(ctx, palette, frame, animation);
        break;
      case 'mech':
        this.drawMechSprite(ctx, palette, frame, animation);
        break;
      case 'recon':
        this.drawReconSprite(ctx, palette, frame, animation);
        break;
      case 'tank_light':
        this.drawTankLightSprite(ctx, palette, frame, animation, recoilOffset);
        break;
      case 'tank_medium':
        this.drawTankMediumSprite(ctx, palette, frame, animation, recoilOffset);
        break;
      case 'artillery':
        this.drawArtillerySprite(ctx, palette, frame, animation, recoilOffset);
        break;
      case 'rocket':
        this.drawRocketSprite(ctx, palette, frame, animation, recoilOffset);
        break;
      case 'anti_air':
        this.drawAntiAirSprite(ctx, palette, frame, animation, recoilOffset);
        break;
      case 'b_copter':
        this.drawBCopterSprite(ctx, palette, frame, animation);
        break;
      case 'fighter':
        this.drawFighterSprite(ctx, palette, frame, animation);
        break;
      case 'bomber':
        this.drawBomberSprite(ctx, palette, frame, animation);
        break;
      case 'battleship':
        this.drawBattleshipSprite(ctx, palette, frame, animation, recoilOffset);
        break;
      default:
        this.drawTankLightSprite(ctx, palette, frame, animation, recoilOffset);
        break;
    }

    ctx.restore();
    return canvas;
  }

  // --- PALETA DE COLORIMETRÍA MILITAR ---
  private getColorPalette(team: 'p1' | 'p2', skinId: string) {
    if (skinId === 'stealth_ops') {
      return {
        primary: '#1e293b',
        secondary: '#0f172a',
        accent: '#f43f5e',
        treads: '#020617',
        highlight: '#475569',
      };
    }
    if (skinId === 'desert') {
      return {
        primary: '#d97706',
        secondary: '#92400e',
        accent: '#fef08a',
        treads: '#451a03',
        highlight: '#fbbf24',
      };
    }
    if (skinId === 'woodland') {
      return {
        primary: '#15803d',
        secondary: '#166534',
        accent: '#86efac',
        treads: '#14532d',
        highlight: '#4ade80',
      };
    }
    if (skinId === 'gold_tribute') {
      return {
        primary: '#eab308',
        secondary: '#ca8a04',
        accent: '#fef08a',
        treads: '#713f12',
        highlight: '#ffffff',
      };
    }

    // Estándar P1 (Rojo Fuego) vs P2 (Azul Táctico)
    if (team === 'p1') {
      return {
        primary: '#dc2626',
        secondary: '#991b1b',
        accent: '#fca5a5',
        treads: '#1f2937',
        highlight: '#ef4444',
      };
    } else {
      return {
        primary: '#2563eb',
        secondary: '#1e40af',
        accent: '#93c5fd',
        treads: '#1e293b',
        highlight: '#3b82f6',
      };
    }
  }

  // --- DIBUJADO DETALLADO POR UNIDAD ---

  private drawInfantrySprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // Piernas (Animación de carrera o paso)
    ctx.fillStyle = '#1e293b';
    const legSwing = anim === 'move' ? (frame % 2 === 0 ? 3 : -3) : 0;
    ctx.fillRect(20 - legSwing, 30, 3, 7);
    ctx.fillRect(25 + legSwing, 30, 3, 7);

    // Torso con chaleco antibalas
    ctx.fillStyle = p.primary;
    ctx.fillRect(19, 19, 10, 11);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(21, 22, 6, 6);

    // Casco militar
    ctx.fillStyle = p.highlight;
    ctx.beginPath();
    ctx.arc(24, 15, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 16, 8, 2);

    // Rifle de asalto
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(25, 23, 11, 3);
    ctx.fillRect(27, 26, 2, 3);

    // Destello de disparo en animación de ataque
    if (anim === 'attack' && frame === 1) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(38, 24, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(39, 23, 3, 2);
    }
  }

  private drawMechSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // Soldado Mech pesado con bazooka al hombro
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(19, 31, 4, 6);
    ctx.fillRect(25, 31, 4, 6);

    // Armadura pesada
    ctx.fillStyle = p.primary;
    ctx.fillRect(17, 18, 14, 13);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(19, 21, 10, 8);

    // Casco reforzado
    ctx.fillStyle = p.highlight;
    ctx.fillRect(20, 11, 8, 7);
    ctx.fillStyle = p.accent;
    ctx.fillRect(22, 14, 4, 2); // Visor

    // Lanzador de misiles / Bazooka tubular
    ctx.fillStyle = '#334155';
    ctx.fillRect(26, 12, 14, 5);
    ctx.fillStyle = '#020617';
    ctx.fillRect(39, 11, 2, 7);

    // Fuego de escape del proyectil
    if (anim === 'attack' && frame === 1) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(23, 13, 3, 3);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(44, 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawReconSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // 4 Ruedas todoterreno
    ctx.fillStyle = '#020617';
    ctx.fillRect(12, 31, 6, 6);
    ctx.fillRect(30, 31, 6, 6);

    // Rines metálicos
    ctx.fillStyle = '#64748b';
    ctx.fillRect(14, 33, 2, 2);
    ctx.fillRect(32, 33, 2, 2);

    // Carrocería de Jeep táctico
    ctx.fillStyle = p.primary;
    ctx.fillRect(11, 22, 26, 9);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(14, 20, 16, 5);

    // Parabrisas polarizado
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, 20, 5, 4);

    // Antena de radio de largo alcance
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 20);
    ctx.lineTo(11, 9);
    ctx.stroke();

    // Ametralladora ligera montada
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 16, 8, 3);
  }

  private drawTankLightSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Orugas (Treads)
    ctx.fillStyle = p.treads;
    ctx.fillRect(10, 28, 28, 9);
    ctx.fillStyle = '#475569';
    // Ruedas internas de oruga
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(12 + i * 6, 31, 4, 4);
    }

    // Chasis principal
    ctx.fillStyle = p.primary;
    ctx.fillRect(12, 22, 24, 8);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(14, 20, 16, 4);

    // Torreta rotatoria con retroceso
    ctx.fillStyle = p.highlight;
    ctx.fillRect(18 + recoil, 15, 12, 7);

    // Cañón del tanque
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30 + recoil, 17, 12, 3);

    // Fogonazo de disparo
    if (anim === 'attack' && frame === 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(44, 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.arc(43, 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTankMediumSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Orugas pesadas dobles
    ctx.fillStyle = p.treads;
    ctx.fillRect(8, 28, 32, 10);
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(10 + i * 6, 31, 4, 5);
    }

    // Chasis blindado angular
    ctx.fillStyle = p.primary;
    ctx.fillRect(10, 21, 28, 9);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(12, 18, 22, 5);

    // Torreta masiva
    ctx.fillStyle = p.highlight;
    ctx.fillRect(16 + recoil, 13, 16, 8);

    // Cañón pesado de gran calibre
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(32 + recoil, 15, 14, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(44 + recoil, 14, 3, 6); // Freno de boca

    if (anim === 'attack' && frame === 1) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(50, 17, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.arc(48, 17, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawArtillerySprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Oruga estacionaria
    ctx.fillStyle = p.treads;
    ctx.fillRect(10, 29, 26, 8);

    // Chasis
    ctx.fillStyle = p.primary;
    ctx.fillRect(12, 23, 24, 7);

    // Cañón Obús elevado en ángulo de 35 grados
    ctx.save();
    ctx.translate(22, 23);
    ctx.rotate((-35 * Math.PI) / 180);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0 + recoil, -3, 20, 5);
    ctx.restore();

    // Estabilizadores de tierra
    ctx.fillStyle = '#475569';
    ctx.fillRect(8, 31, 3, 6);
  }

  private drawRocketSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Ruedas blindadas
    ctx.fillStyle = '#020617';
    ctx.fillRect(10, 31, 6, 6);
    ctx.fillRect(20, 31, 6, 6);
    ctx.fillRect(30, 31, 6, 6);

    // Cabina
    ctx.fillStyle = p.primary;
    ctx.fillRect(28, 22, 10, 9);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(33, 23, 4, 4);

    // Batería lanzacohetes angulada
    ctx.fillStyle = p.secondary;
    ctx.save();
    ctx.translate(14, 25);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.fillRect(-6 + recoil, -8, 18, 9);
    // Cohetes en los silos
    ctx.fillStyle = '#f87171';
    ctx.fillRect(10 + recoil, -7, 3, 2);
    ctx.fillRect(10 + recoil, -3, 3, 2);
    ctx.restore();
  }

  private drawAntiAirSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Oruga rápida
    ctx.fillStyle = p.treads;
    ctx.fillRect(10, 28, 28, 9);

    // Chasis
    ctx.fillStyle = p.primary;
    ctx.fillRect(12, 22, 24, 7);

    // Cañones vulcan cuádruples inclinados
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22 + recoil, 11, 14, 2);
    ctx.fillRect(22 + recoil, 14, 14, 2);
    ctx.fillRect(18, 16, 10, 7);
  }

  private drawBCopterSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // Rotores giratorios superiores
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rotorOffset = (frame * 12) % 24;
    ctx.moveTo(8 + rotorOffset, 9);
    ctx.lineTo(40 - rotorOffset, 9);
    ctx.stroke();

    // Mástil del rotor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(23, 9, 2, 4);

    // Fuselaje del helicóptero de ataque
    ctx.fillStyle = p.primary;
    ctx.fillRect(16, 13, 18, 12);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(20, 20, 10, 5);

    // Cabina acristalada
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(28, 15, 6, 6);

    // Cola y rotor de cola
    ctx.fillStyle = p.primary;
    ctx.fillRect(8, 16, 9, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(6, 13, 2, 8);

    // Patines de aterrizaje
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, 27, 16, 2);
    ctx.fillRect(19, 25, 2, 2);
    ctx.fillRect(27, 25, 2, 2);
  }

  private drawFighterSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // Caza supersónico delta
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(42, 24); // Nariz
    ctx.lineTo(14, 12); // Punta ala izquierda
    ctx.lineTo(20, 24); // Cola centro
    ctx.lineTo(14, 36); // Punta ala derecha
    ctx.closePath();
    ctx.fill();

    // Cabina
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(28, 22, 6, 4);

    // Postcombustión del reactor
    ctx.fillStyle = '#f97316';
    ctx.fillRect(14, 23, 5, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(11, 23, 3, 2);
  }

  private drawBomberSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string
  ) {
    // Bombardero pesado con gran envergadura
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(38, 24);
    ctx.lineTo(8, 8);
    ctx.lineTo(16, 24);
    ctx.lineTo(8, 40);
    ctx.closePath();
    ctx.fill();

    // Motores de turbina
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 14, 6, 4);
    ctx.fillRect(16, 26, 6, 4);
  }

  private drawBattleshipSprite(
    ctx: CanvasRenderingContext2D,
    p: ReturnType<typeof this.getColorPalette>,
    frame: number,
    anim: string,
    recoil: number
  ) {
    // Estela de agua
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(6, 33, 36, 2);

    // Casco naval de acorazado
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(6, 24);
    ctx.lineTo(40, 24);
    ctx.lineTo(44, 30);
    ctx.lineTo(6, 30);
    ctx.closePath();
    ctx.fill();

    // Superestructura / Puente de mando
    ctx.fillStyle = p.primary;
    ctx.fillRect(18, 17, 12, 7);

    // Baterías dobles de artillería naval
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10 + recoil, 21, 6, 4);
    ctx.fillRect(8 + recoil, 22, 4, 2);

    ctx.fillRect(32 + recoil, 21, 6, 4);
    ctx.fillRect(36 + recoil, 22, 4, 2);
  }

  private renderExplosionFrame(frameIdx: number): HTMLCanvasElement {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const center = size / 2;
    const radius = 6 + frameIdx * 3.5;

    // Bola de fuego y humo en expansión
    const gradient = ctx.createRadialGradient(center, center, 2, center, center, radius);
    if (frameIdx < 3) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#fef08a');
      gradient.addColorStop(0.7, '#f97316');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    } else {
      gradient.addColorStop(0, '#f97316');
      gradient.addColorStop(0.5, '#475569');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    // Partículas y chispas
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const dist = radius * 0.8;
      ctx.fillRect(center + Math.cos(angle) * dist, center + Math.sin(angle) * dist, 2, 2);
    }

    return canvas;
  }
}

export const assetLoader = TacticalAssetLoader.getInstance();
