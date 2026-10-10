/**
 * Skriver ett kortkommando som det ser ut på användarens dator. Texterna i `i18n` anges med
 * "Ctrl+"; på Mac visas ⌘ (och ⇧⌘ för Ctrl+Shift), som i File-menyn.
 */
export function shortcutLabel(keys: string, mac: boolean): string {
  if (!mac) return keys;
  return keys.replaceAll("Ctrl+Shift+", "⇧⌘").replaceAll("Ctrl+", "⌘");
}

export const isMac = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
