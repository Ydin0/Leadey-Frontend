export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
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
