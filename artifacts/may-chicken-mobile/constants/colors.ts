/**
 * Semantic design tokens for May Chicken & Burger mobile.
 *
 * Synced from the sibling web artifact (artifacts/may-chicken/src/index.css):
 * dark brand theme, vivid red primary (hsl 350 89% 60%), sharp corners.
 * The brand is dark-first, so light and dark share the same palette.
 */

const palette = {
  // Legacy aliases (kept for backward compatibility)
  text: "#fafafa",
  tint: "#f43f5e",

  // Core surfaces
  background: "#0a0a0a",
  foreground: "#fafafa",

  // Cards / elevated surfaces
  card: "#0f0f0f",
  cardForeground: "#fafafa",

  // Primary action color (buttons, links, active states)
  primary: "#f43f5e",
  primaryForeground: "#ffffff",

  // Secondary / less-emphasis interactive surfaces
  secondary: "#1f1f1f",
  secondaryForeground: "#fafafa",

  // Muted / subdued elements (dividers, timestamps, placeholders)
  muted: "#262626",
  mutedForeground: "#a3a3a3",

  // Accent highlights (badges, selected items, focus rings)
  accent: "#f43f5e",
  accentForeground: "#ffffff",

  // Destructive actions (delete, error states)
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",

  // Borders and input outlines
  border: "#262626",
  input: "#262626",
};

const colors = {
  light: palette,
  dark: palette,

  // Synced from web --radius: 0rem (sharp, unapologetic corners)
  radius: 0,
};

export default colors;
