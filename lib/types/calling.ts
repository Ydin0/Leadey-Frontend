/* ──────────────────────────────────────────────
   Twilio Calling — Type Definitions
   ────────────────────────────────────────────── */

// ── Phone Line ───────────────────────────────

export type PhoneLineStatus = "active" | "suspended" | "pending" | "released";
export type PhoneLineType = "local" | "toll-free" | "mobile";

export interface PhoneLineConfig {
  voicemailGreeting: string;
  callForwardingNumber: string;
  callRecordingEnabled: boolean;
}

export interface PhoneLineStats {
  callsMade: number;
  callsReceived: number;
  totalMinutes: number;
  costThisMonth: number;
}

export interface PhoneLine {
  id: string;
  number: string;
  friendlyName: string;
  country: string;
  countryCode: string;
  type: PhoneLineType;
  status: PhoneLineStatus;
  assignedTo: string | null; // team member id
  assignedToName: string | null;
  monthlyCost: number;
  config: PhoneLineConfig;
  stats: PhoneLineStats;
  createdAt: string;
}

// ── Regulatory Bundle ────────────────────────

export type BundleStatus = "draft" | "pending-review" | "twilio-approved" | "twilio-rejected";

export type BundleNumberType = "local" | "mobile" | "national" | "toll-free";
export type BundleEndUserType = "business" | "individual";

export interface RegulatoryBundle {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  status: BundleStatus;

  // Twilio regulation key: (country, numberType, endUserType) is unique.
  numberType: BundleNumberType;
  endUserType: BundleEndUserType;

  // Business
  businessName: string;
  businessType: string;
  businessRegistrationAuthority: string;
  businessRegistrationNumber: string;
  businessWebsite: string;
  businessClassification: string;

  // Address
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressSubdivision: string;
  addressPostalCode: string;

  // Authorized representative
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  representativePhone: string;

  // Legacy
  businessAddress: string;
  contactEmail: string;
  contactPhone: string;
  identityDocumentName: string;

  // Twilio SIDs
  twilioBundleSid?: string | null;
  twilioEndUserSid?: string | null;
  twilioAddressSid?: string | null;
  twilioIndividualEndUserSid?: string | null;

  createdAt: string;
}

export interface BundleDocument {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  twilioDocumentSid?: string | null;
  createdAt: string;
}

// ── Call Records ─────────────────────────────

export type CallDirection = "inbound" | "outbound" | "missed";
export type CallDisposition = "completed" | "no-answer" | "busy" | "voicemail" | "failed";

export interface CallRecord {
  id: string;
  direction: CallDirection;
  from: string;
  to: string;
  contactName: string | null;
  companyName: string | null;
  lineId: string;
  duration: number; // seconds
  disposition: CallDisposition;
  recordingUrl?: string | null;
  recordingSid?: string | null;
  recordingDuration?: number;
  transcript?: string | null;
  summary?: string | null;
  userId?: string | null;
  userName?: string | null;
  timestamp: string;
}

// ── Active Call (ephemeral UI state) ─────────

export type CallState = "idle" | "ringing" | "connected" | "ended";

export interface ActiveCall {
  callId: string;
  state: CallState;
  direction: CallDirection;
  from: string;
  to: string;
  contactName: string | null;
  lineId: string;
  isMuted: boolean;
  isOnHold: boolean;
  isDtmfVisible: boolean;
  duration: number; // seconds since connected
}

// ── Available Number (Twilio search result) ──

export interface AvailableNumber {
  id: string;
  number: string;
  locality: string;
  region: string;
  country: string;
  countryCode: string;
  type: PhoneLineType;
  monthlyCost: number;
  capabilities: ("voice" | "sms" | "mms")[];
}

// ── Provision Wizard ─────────────────────────

export interface ProvisionWizardData {
  country: CountryOption | null;
  type: PhoneLineType | null;
  bundleId: string | null;
  selectedNumber: AvailableNumber | null;
  assignedTo: string | null;
  friendlyName: string;
}

// ── Country Options ──────────────────────────

export interface CountryOption {
  code: string;          // ISO 3166-1 alpha-2
  name: string;
  flag: string;          // emoji
  availableTypes: PhoneLineType[];
  bundleRequired: boolean;
}

// ── Call Context ─────────────────────────────

export interface CallContextValue {
  activeCall: ActiveCall | null;
  phoneLines: PhoneLine[];
  callHistory: CallRecord[];
  selectedLineId: string | null;
  setSelectedLineId: (id: string | null) => void;
  startCall: (to: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  toggleDtmfPad: () => void;
  sendDtmf: (digit: string) => void;
  phoneLinesLoading: boolean;
  refreshPhoneLines: () => Promise<void>;
}
