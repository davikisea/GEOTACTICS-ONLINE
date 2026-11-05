/**
 * ==============================================================================
 * EMPAQUETADO BINARIO ULTRALIGERO (TACTICAL BITMAP) - OPENPLACE BRIDGE
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.4
 * - Grilla Táctica (20x20 = 400 celdas): 400 bits / 8 = 50 bytes (Niebla de Guerra).
 * - Macro-Globo (3,000 regiones): 3,000 bits / 8 = 375 bytes (Soberanía / Alerta).
 * - Serialización Base64 ultrarrápida para WebSockets y Store Local.
 * ==============================================================================
 */

export class TacticalBitMap {
  public bytes: Uint8Array;

  constructor(initialBytesOrBitCount?: Uint8Array | number) {
    if (typeof initialBytesOrBitCount === 'number') {
      this.bytes = new Uint8Array(Math.ceil(initialBytesOrBitCount / 8));
    } else if (initialBytesOrBitCount instanceof Uint8Array) {
      this.bytes = initialBytesOrBitCount;
    } else {
      this.bytes = new Uint8Array(0);
    }
  }

  /**
   * Enciende (1) o apaga (0) el bit en el índice especificado.
   * Redimensiona automáticamente el array si el índice sobrepasa la longitud actual.
   */
  public setBit(index: number, value: boolean): void {
    if (index < 0) return;
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    if (byteIndex >= this.bytes.length) {
      const newBytes = new Uint8Array(byteIndex + 1);
      newBytes.set(this.bytes, newBytes.length - this.bytes.length);
      this.bytes = newBytes;
    }

    const realIndex = this.bytes.length - 1 - byteIndex;
    if (value) {
      this.bytes[realIndex]! |= 1 << bitIndex;
    } else {
      this.bytes[realIndex]! &= ~(1 << bitIndex);
    }
  }

  /**
   * Consulta el valor booleano del bit en el índice dado.
   */
  public getBit(index: number): boolean {
    if (index < 0) return false;
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    if (byteIndex >= this.bytes.length) return false;
    const realIndex = this.bytes.length - 1 - byteIndex;
    return (this.bytes[realIndex]! & (1 << bitIndex)) !== 0;
  }

  /**
   * Serializa el bitmap binario a una cadena Base64 compacta.
   */
  public toBase64(): string {
    let binary = '';
    for (let i = 0; i < this.bytes.length; i++) {
      binary += String.fromCodePoint(this.bytes[i]!);
    }
    return globalThis.btoa(binary);
  }

  /**
   * Deserializa una cadena Base64 a una instancia de TacticalBitMap.
   */
  public static fromBase64(base64: string): TacticalBitMap {
    if (!base64) return new TacticalBitMap(0);
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.codePointAt(i)!;
    }
    return new TacticalBitMap(bytes);
  }
}
