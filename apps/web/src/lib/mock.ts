export const MODULE_ORDER = ["listening", "reading", "writing"] as const;

export function moduleRank(module: string): number {
  const i = MODULE_ORDER.indexOf(module as (typeof MODULE_ORDER)[number]);
  return i === -1 ? MODULE_ORDER.length : i;
}
