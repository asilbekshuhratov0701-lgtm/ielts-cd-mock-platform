"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
  style
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const t = setTimeout(() => setShown(true), delay);
            io.disconnect();
            return () => clearTimeout(t);
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    const safety = setTimeout(() => setShown(true), 4000);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(28px)",
        transition: "opacity 0.7s ease, transform 0.7s ease"
      }}
    >
      {children}
    </div>
  );
}
