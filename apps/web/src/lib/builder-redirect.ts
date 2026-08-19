const BUILDER_PATH = /^\/admin\/exam-import(\/[A-Za-z0-9/_-]+)?$/;

export function safeBuilderPath(value: FormDataEntryValue | null, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return BUILDER_PATH.test(raw) ? raw : fallback;
}
