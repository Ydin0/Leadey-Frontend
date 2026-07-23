import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getLeadTimeline } from "@/lib/api/funnels";
import { qk } from "./keys";
import { STALE } from "./config";

/** A focused lead's activity timeline — the lead + its company's contacts'
 *  events, keyed by leadId. Fetched independently of the (heavy) funnel payload
 *  so opening a lead doesn't reload the whole campaign's leads. */
export function useLeadTimeline(funnelId: string, leadId: string, opts?: { enabled?: boolean }) {
  const isAuthReady = useAuthReady();
  return useQuery({
    queryKey: qk.leadTimeline(funnelId, leadId),
    queryFn: () => getLeadTimeline(funnelId, leadId),
    staleTime: STALE.FUNNEL,
    enabled: isAuthReady && !!funnelId && !!leadId && (opts?.enabled ?? true),
  });
}
