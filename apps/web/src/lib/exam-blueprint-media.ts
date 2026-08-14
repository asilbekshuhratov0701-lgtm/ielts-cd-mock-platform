export function setGroupImageOn(root: unknown, groupId: string, url: string): boolean {
  if (!root || typeof root !== "object") return false;
  const sections = (root as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const section of sections) {
    const groups = (section as { groups?: unknown }).groups;
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (group && typeof group === "object" && (group as { id?: unknown }).id === groupId) {
        (group as Record<string, unknown>).imageUrl = url;
        changed = true;
      }
    }
  }
  return changed;
}
