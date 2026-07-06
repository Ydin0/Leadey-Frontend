export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
  /** Granular app-role: a built-in key or a custom org_roles id ("role_…"). */
  appRole?: string;
  /** Whether this member has per-user permission overrides on top of the role. */
  hasOverrides?: boolean;
  createdAt: string;
}

export interface PendingInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface SeatUsage {
  used: number;
  included: number;
}
