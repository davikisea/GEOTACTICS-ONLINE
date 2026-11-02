/**
 * PRUEBAS DETERMINISTAS DEL BARK ENGINE PROCEDURAL (NOVELA GRÁFICA)
 * Valida la selección de diálogos cómics, sellos Pop-Art, tokens dinámicos y anti-repetición.
 */

import { barkEngine, CANONICAL_BARK_TEMPLATES } from './barkEngine';

describe('Bark Engine Procedural Test Suite', () => {
  it('debe contener plantillas canónicas para los comandantes principales', () => {
    expect(CANONICAL_BARK_TEMPLATES.length).toBeGreaterThan(15);
    const stellaBarks = CANONICAL_BARK_TEMPLATES.filter(b => b.commanderId === 'stella');
    const volkovBarks = CANONICAL_BARK_TEMPLATES.filter(b => b.commanderId === 'volkov');
    const vanceBarks = CANONICAL_BARK_TEMPLATES.filter(b => b.commanderId === 'vance');

    expect(stellaBarks.length).toBeGreaterThan(0);
    expect(volkovBarks.length).toBeGreaterThan(0);
    expect(vanceBarks.length).toBeGreaterThan(0);
  });

  it('debe interpolar {player_name} como "Cadete" si el nivel de vínculo es < 3', async () => {
    const result = await barkEngine.triggerBark({
      commanderId: 'stella',
      triggerContext: 'match_start',
      bondingLevel: 1,
      playerName: 'Comandante Alpha',
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.text).not.toContain('{player_name}');
      expect(result.commanderId).toBe('stella');
    }
  });

  it('debe interpolar el nombre real del jugador si el vínculo es >= 3', async () => {
    const result = await barkEngine.triggerBark({
      commanderId: 'volkov',
      triggerContext: 'match_start',
      bondingLevel: 3,
      playerName: 'VolkovCamarada',
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.text).not.toContain('{player_name}');
      expect(result.text).toContain('VolkovCamarada');
    }
  });

  it('debe asociar sellos onomatopéyicos Pop-Art correctos para triggers críticos', async () => {
    const result = await barkEngine.triggerBark({
      commanderId: 'stella',
      triggerContext: 'trap_ambush',
      bondingLevel: 2,
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.onomatopoeia).toBe('¡TRAP!');
      expect(result.bubbleShape).toBe('shout');
    }
  });

  it('debe asignar la forma de bocadillo correcta (speech, shout, thought, whisper, radio)', async () => {
    const whisperResult = await barkEngine.triggerBark({
      commanderId: 'volkov',
      triggerContext: 'trap_ambush',
      bondingLevel: 1,
    });

    expect(whisperResult).not.toBeNull();
    if (whisperResult) {
      expect(whisperResult.bubbleShape).toBe('whisper');
      expect(whisperResult.onomatopoeia).toBe('¡TRAP!');
    }
  });

  it('debe generar barks contextuales de Lobby según hora del día, victoria/derrota, clic y hover de estaciones', () => {
    const morningBark = barkEngine.getLobbyContextualBark({
      commanderId: 'andy',
      intent: 'time_of_day',
      hourOfDay: 9,
      bondingLevel: 5,
      playerName: 'Comandante',
    });
    expect(morningBark.commanderId).toBe('andy');
    expect(morningBark.contextLabel).toContain('MATUTINA');
    expect(morningBark.text).toContain('Andy');

    const hoverArmoryBark = barkEngine.getLobbyContextualBark({
      commanderId: 'sami',
      intent: 'hover_armory',
      bondingLevel: 8,
    });
    expect(hoverArmoryBark.commanderId).toBe('sami');
    expect(hoverArmoryBark.contextLabel).toContain('HANGAR');
    expect(hoverArmoryBark.onomatopoeia).toBe('¡TACTICAL!');

    const victoryBark = barkEngine.getLobbyContextualBark({
      commanderId: 'von_bolt',
      intent: 'last_match_victory',
      bondingLevel: 8,
    });
    expect(victoryBark.commanderId).toBe('von_bolt');
    expect(victoryBark.onomatopoeia).toBe('¡CLUTCH!');
  });
});
