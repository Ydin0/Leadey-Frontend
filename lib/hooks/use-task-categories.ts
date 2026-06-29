"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getTaskCategories, DEFAULT_TASK_CATEGORIES, type TaskCategoryDef } from "@/lib/api/task-categories";

/** Loads the org's task categories (follow-up/call-back/reminder/…). Falls back
 *  to the defaults until the request resolves. */
export function useTaskCategories() {
  const isAuthReady = useAuthReady();
  const [categories, setCategories] = useState<TaskCategoryDef[]>(DEFAULT_TASK_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await getTaskCategories();
      if (Array.isArray(list) && list.length) setCategories(list);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
  }, [isAuthReady, reload]);

  return { categories, loading, reload };
}
