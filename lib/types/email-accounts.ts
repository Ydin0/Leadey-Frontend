export type EmailAccountProvider = "gmail" | "outlook" | "smtp";

export interface EmailAccount {
  id: string;
  provider: EmailAccountProvider;
  email: string;
  fromName: string;
  /** Custom raw signature (fallback when no shared signature is chosen). */
  signature: string | null;
  /** Chosen shared signature id (email_signatures.id), or null. */
  signatureId: string | null;
  status: string; // active | error | disconnected
  isDefault: boolean;
  createdAt: string;
}

/** Admin org-wide view: every connected mailbox + its owner. */
export interface OrgEmailAccount extends EmailAccount {
  userId: string;
  ownerName: string | null;
}

export interface SmtpConnectPayload {
  email: string;
  fromName?: string;
  username?: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}
