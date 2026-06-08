"use client";

import { useCallback, useEffect, useState } from "react";
import { listCustomFields } from "@/lib/api/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types/custom-field";
import { useAuthReady } from "@/components/providers/auth-token-sync";

/** Loads the org's custom lead field definitions. Empty until resolved. */
export function useCustomFields() {
  const isAuthReady = useAuthReady();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await listCustomFields();
      if (Array.isArray(list)) setFields(list);
    } catch {
      // keep last-known list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
  }, [isAuthReady, reload]);

  return { fields, loading, reload };
}
