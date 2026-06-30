export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  last4: string;
  /** Masked label for display, e.g. `leadey_sk_live_••••a1b2`. */
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: "active" | "revoked";
}

/** Returned only by create — `secret` is the full key, shown exactly once. */
export interface CreatedApiKey {
  key: ApiKey;
  secret: string;
}
