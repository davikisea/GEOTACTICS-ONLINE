// ==============================================================================
// PUBLIC API: SHARED
// Primitivas de UI Atompunk, Cliente Supabase, Tipos Globales y Utilidades
// ==============================================================================

// Supabase Client
export { supabase, isSupabaseConfigured } from './lib/supabase/client';

// Shared UI Primitives
export { TacticalGhostBar } from './ui/TacticalGhostBar';
export { QADevOpsRunner } from './qa/QADevOpsRunner';
export { TacticalErrorBoundary } from './ui/TacticalErrorBoundary';
export { AuthTerminalModal } from './auth/AuthTerminalModal';

// Shared Types
export * from './types/index';
export * from './types/database.types';
export * from './types/metagame';
export * from './types/network';

// Shared Services & Auth
export { catalogRegistry, type CatalogChangeListener } from './services/catalogRegistryService';
export { useAuth } from './auth/useAuth';

// Asset Optimization & QA Harness
export * from './lib/shopData';
export { assetLoader } from './lib/assetLoader';
export { AssetOptimizationEngine, type PerformanceCheckItem, type WebPOptimizationReport } from './lib/assetOptimization';
export { initQABridge, updateQASnapshot, type QAGameSnapshot } from './utils/qaHarness';
