"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/lib/store";

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initializeFromBackend = useDashboardStore((state) => state.initializeFromBackend);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeFromBackend();
    }
  }, [initializeFromBackend]);

  return <>{children}</>;
}
