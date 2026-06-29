import { apiRequest } from "./client";

export interface CalendlyStatus {
  platformConfigured: boolean;
  connected: boolean;
  email: string | null;
  schedulingUrl: string | null;
  status: string | null;
}

export async function getCalendlyStatus(): Promise<CalendlyStatus> {
  return apiRequest<CalendlyStatus>("/calendly/status");
}

/** Returns the Calendly authorize URL to send the rep to. */
export async function startCalendlyOAuth(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/calendly/oauth/start");
}

export async function disconnectCalendly(): Promise<void> {
  await apiRequest("/calendly/disconnect", { method: "DELETE" });
}
