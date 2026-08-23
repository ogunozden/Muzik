/**
 * Compat re-export — original ScoreSurface now lives as ScoreSurfaceVex.
 * Keep this file for backward imports: `from "@/features/score-engine/workbench/ScoreSurface"`.
 * New code should import ScoreSurfaceVex or ScoreSurfaceRouter directly.
 */
export * from "@/features/score-engine/workbench/ScoreSurfaceVex";
export {ScoreSurfaceVex as ScoreSurface} from "@/features/score-engine/workbench/ScoreSurfaceVex";
