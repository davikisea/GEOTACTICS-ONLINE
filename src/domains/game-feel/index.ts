// ==============================================================================
// PUBLIC API: DOMINIO GAME-FEEL
// Web Audio API, Bark Engine Comic, Onomatopeyas Pop-Art y Respuesta Háptica
// ==============================================================================

export {
  audioManager,
  AUDIO_SYNTHESIS_CATALOG,
  type SfxType,
  type SoundCueConfig,
  type AudioSettings,
} from './core/audioManager';
export {
  barkEngine,
  CANONICAL_BARK_TEMPLATES,
  type LobbyBarkIntent,
  type BarkTriggerContext,
  type BarkSelfOptimizationMetrics,
  type BubbleShape,
  type OnomatopoeiaStamp,
  type VignetteMood,
  type BarkTemplate,
  type ActiveBarkDisplay,
} from './core/barkEngine';
export { triggerHaptic, type HapticPattern } from './core/hapticFeedback';
export { CommanderLivingVignette } from './components/CommanderLivingVignette';
export {
  CommanderBarkWidget,
  type BarkBalloonType,
  type BarkMessage,
} from './components/CommanderBarkWidget';
