"use client";

import { useEffect } from "react";

export function ExitFullscreen() {
  useEffect(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  }, []);
  return null;
}
