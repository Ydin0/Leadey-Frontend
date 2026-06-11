export type EmailAccountProvider = "gmail" | "outlook" | "smtp";

export interface EmailAccount {
  id: string;
  provider: EmailAccountProvider;
  email: string;
  fromName: string;
  status: string; // active | error | disconnected
  isDefault: boolean;
  createdAt: string;
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
