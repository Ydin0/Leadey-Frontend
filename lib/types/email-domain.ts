export type DnsState = "pass" | "warn" | "fail";
export type DomainStatus = "healthy" | "warning" | "critical";

export interface DnsRecord {
  type: string;
  label: string;
  value: string;
  state: DnsState;
}

export interface EmailDomain {
  id: string;
  name: string;
  client: string;
  registrar: string;
  purchased: boolean;
  age: string;
  health: number;
  status: DomainStatus;
  spf: DnsState;
  dkim: DnsState;
  dmarc: DnsState;
  mx: DnsState;
  tracking: DnsState;
  dnsRecords: DnsRecord[];
  /** Number of connected mailboxes on this domain (from Smartlead). */
  mailboxes?: number;
  createdAt: string;
  updatedAt: string;
}
