import { Download } from "lucide-react";

const FORMATS: [string, string][] = [
  ["xlsx", "Excel (.xlsx)"],
  ["pdf", "PDF (.pdf)"],
  ["doc", "Word (.doc)"],
  ["csv", "CSV (.csv)"],
  ["json", "JSON (.json)"]
];

export function ExportMenu({
  endpoint,
  params,
  label
}: {
  endpoint: "results" | "writing" | "report";
  params: Record<string, string>;
  label: string;
}) {
  const href = (format: string) =>
    `/api/admin/exports/${endpoint}?${new URLSearchParams({ ...params, format }).toString()}`;

  return (
    <details className="group relative inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand-50 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
        <Download className="h-4 w-4" /> {label}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card">
        {FORMATS.map(([format, name]) => (
          <a
            key={format}
            href={href(format)}
            className="block px-3 py-1.5 text-sm text-foreground hover:bg-brand-50 hover:text-brand-700"
          >
            {name}
          </a>
        ))}
      </div>
    </details>
  );
}
