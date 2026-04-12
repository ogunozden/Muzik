/**
 * Theme - Merkezi Tasarım Sistemi
 * 
 * Bu modül tüm tasarım tokenlarını tek bir yerden export eder.
 * 
 * KULLANIM:
 * import { colors, spacing, typography, radius, shadows, componentTokens } from '@/lib';
 */

export { colors, type Colors } from "./colors";
export { spacing, type Spacing } from "./spacing";
export { typography, type Typography } from "./typography";
export { radius, type Radius } from "./radius";
export { shadows, type Shadows } from "./shadows";

export {
  // Component-specific tokens
  buttonTokens,
  inputTokens,
  cardTokens,
  badgeTokens,
  statusTokens,
  usulTokens,
  instrumentTokens,
  layoutTokens,
  
  // Types
  type ButtonVariant,
  type ButtonSize,
  type InputVariant,
  type InputSize,
  type CardVariant,
  type BadgeColor,
  type StatusType,
} from "./component-tokens";
