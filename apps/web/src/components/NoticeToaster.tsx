"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { noticeFor } from "@/lib/notices";

export function NoticeToaster() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const shown = useRef<string | null>(null);

  const code = params.get("notice") ?? params.get("error");

  useEffect(() => {
    if (!code || shown.current === code) return;
    const notice = noticeFor(code);
    shown.current = code;

    toast.show(
      notice ?? {
        variant: "error",
        title: "Something went wrong",
        description: `The server reported "${code}".`
      }
    );

    const next = new URLSearchParams(params.toString());
    next.delete("notice");
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [code, params, pathname, router, toast]);

  return null;
}
