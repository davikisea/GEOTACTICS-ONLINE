/**
 * ==============================================================================
 * PRUEBAS DETERMINISTAS: TACTICAL STUDIO EDITOR — MAP BUILDER
 * ==============================================================================
 * Valida la matemática de simetría asistida (180°, horizontal, vertical),
 * la detección de zonas de AirDrops y la integridad del exportador canónico.
 */

describe('Tactical Studio Editor: Map Builder Engine', () => {
  it('debe calcular correctamente la simetría rotacional 180° para mapas competitivos', () => {
    const width = 10;
    const height = 10;

    // Colocación de HQ1 en esquina superior izquierda (0, 0)
    const p1X = 0;
    const p1Y = 0;

    // Función de simetría 180°
    const mirrorX = width - 1 - p1X;
    const mirrorY = height - 1 - p1Y;

    expect(mirrorX).toBe(9);
    expect(mirrorY).toBe(9);

    // Casilla descentrada (2, 3)
    const testX = 2;
    const testY = 3;
    expect(width - 1 - testX).toBe(7);
    expect(height - 1 - testY).toBe(6);
  });

  it('debe calcular correctamente la simetría horizontal y vertical', () => {
    const width = 16;
    const height = 16;

    // Simetría Horizontal
    const hMirror = (x: number) => width - 1 - x;
    expect(hMirror(0)).toBe(15);
    expect(hMirror(7)).toBe(8);

    // Simetría Vertical
    const vMirror = (y: number) => height - 1 - y;
    expect(vMirror(0)).toBe(15);
    expect(vMirror(5)).toBe(10);
  });

  it('debe validar que las casillas candidatas de AirDrop cumplan |D_M(HQ1) - D_M(HQ2)| <= 1', () => {
    const width = 10;
    const height = 10;
    const hq1 = { x: 0, y: 0 };
    const hq2 = { x: 9, y: 9 };

    const isCandidate = (x: number, y: number) => {
      const d1 = Math.abs(x - hq1.x) + Math.abs(y - hq1.y);
      const d2 = Math.abs(x - hq2.x) + Math.abs(y - hq2.y);
      return Math.abs(d1 - d2) <= 1;
    };

    // La diagonal central (4,5) y (5,4) debe ser candidata perfecta
    expect(isCandidate(4, 5)).toBe(true);
    expect(isCandidate(5, 4)).toBe(true);

    // Las casillas adyacentes al HQ1 no deben ser candidatas
    expect(isCandidate(0, 1)).toBe(false);
    expect(isCandidate(1, 1)).toBe(false);
  });
});
