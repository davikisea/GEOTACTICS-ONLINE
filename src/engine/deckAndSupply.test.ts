/**
 * Re-exportación de la suite de suministros y doble llave para compatibilidad de comandos legados (test:sprint3)
 */
export * from './hangarAndSupply.test';
export { runHangarAndSupplySuite as runDeckAndSupplySuite } from './hangarAndSupply.test';
