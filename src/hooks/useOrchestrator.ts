/**
 * useOrchestrator - Context-based Hook
 * 
 * Artık context üzerinden global state'e erişir.
 * Sayfa geçişlerinde state korunur.
 * 
 * @deprecated Use useOrchestrator() from this file - it now uses context
 */

export {
  useOrchestrator,
  OrchestratorProvider,
  type OrchestratorState,
  type OrchestratorActions,
} from "@/contexts/OrchestratorContext";
