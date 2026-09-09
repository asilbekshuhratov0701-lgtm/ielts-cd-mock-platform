"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { noticeFor } from "@/lib/notices";

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), 15000);
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const seconds = probe.duration;
      done(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null);
    };
    probe.onerror = () => done(null);
    probe.src = url;
  });
}

export function MediaUploadField({
  kind,
  blueprintId,
  groupId,
  label,
  accept
}: {
  kind: "audio" | "group-image";
  blueprintId: string;
  groupId?: string;
  label: string;
  accept: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = (file: File, durationSec: number | null) => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("blueprintId", blueprintId);
    if (groupId) form.set("groupId", groupId);
    if (durationSec) form.set("durationSec", String(durationSec));
    form.set("file", file);

    const id = toast.show({
      variant: "loading",
      title: `Uploading ${file.name}`,
      description: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      progress: 0
    });
    setBusy(true);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      toast.update(id, { progress: (event.loaded / event.total) * 100 });
    };

    xhr.onload = () => {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      let code = "upload_failed";
      try {
        code = (JSON.parse(xhr.responseText) as { code?: string }).code ?? code;
      } catch {
        // keep the fallback code
      }
      const notice = noticeFor(code);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.update(id, {
          variant: notice?.variant ?? "success",
          title: notice?.title ?? "Upload complete",
          description: notice?.description ?? file.name,
          progress: undefined
        });
        router.refresh();
      } else {
        toast.update(id, {
          variant: "error",
          title: notice?.title ?? "Upload failed",
          description: notice?.description ?? `The server responded with ${xhr.status}.`,
          progress: undefined
        });
      }
    };

    xhr.onerror = () => {
      setBusy(false);
      toast.update(id, {
        variant: "error",
        title: "Upload failed",
        description: "The connection dropped before the file finished.",
        progress: undefined
      });
    };

    xhr.send(form);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (kind !== "audio") {
            upload(file, null);
            return;
          }
          void readAudioDuration(file).then((seconds) => upload(file, seconds));
        }}
        className="block w-full max-w-xs text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" /> {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}
