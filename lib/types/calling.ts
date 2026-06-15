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

/** One diarized, timestamped line of the call transcript. */
export interface TranscriptSegment {
  speaker: string; // stable id ("A" / "B")
  start: number; // seconds
  end: number;
  text: string;
}
export interface TranscriptSpeaker {
  id: string;
  name: string;
  role: "rep" | "prospect" | "other";
  talkPct: number; // 0-100
}
export interface CallSummaryStructured {
  tldr: string[];
  sections: { title: string; points: string[] }[];
  nextSteps?: string[];
}

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
  transcriptSegments?: TranscriptSegment[] | null;
  speakers?: TranscriptSpeaker[] | null;
  summaryStructured?: CallSummaryStructured | null;
  userId?: string | null;
  userName?: string | null;
  timestamp: string;
}

// ── Active Call (ephemeral UI state) ─────────

export type CallState = "idle" | "ringing" | "connected" | "ended";

/** Optional context attached when starting a call so the resulting record /
 *  recording is attributable to a person & company, not just a number. */
export interface CallMeta {
  contactName?: string | null;
  companyName?: string | null;
  leadId?: string | null;
  /** Campaign this lead belongs to — set so the call is logged as a step
   *  touch (advances the call step + increments the call counter). */
  funnelId?: string | null;
}

export interface ActiveCall {
  callId: string;
  state: CallState;
  direction: CallDirection;
  from: string;
  to: string;
  contactName: string | null;
  /** Resolved on connect for callers that match a known lead/contact. */
  companyName?: string | null;
  leadId?: string | null;
  funnelId?: string | null;
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

/** Dispatched once the call has fully disconnected AND the call record has
 *  been persisted server-side. The dialer subscribes to this so it can wire
 *  the callRecordId into its /advance call. */
export interface EndedCallInfo {
  callSid: string | null;
  callRecordId: string | null;
  duration: number;
  direction: "outbound" | "inbound";
  from: string;
  to: string;
  endedAt: number; // epoch ms
  /** Lead/campaign this call was placed against, if any — lets list views
   *  refresh the right campaign once the call is logged. */
  leadId?: string | null;
  funnelId?: string | null;
}

export interface CallContextValue {
  activeCall: ActiveCall | null;
  phoneLines: PhoneLine[];
  callHistory: CallRecord[];
  selectedLineId: string | null;
  setSelectedLineId: (id: string | null) => void;
  startCall: (to: string, meta?: CallMeta) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  toggleDtmfPad: () => void;
  sendDtmf: (digit: string) => void;
  phoneLinesLoading: boolean;
  refreshPhoneLines: () => Promise<void>;
  /** Last ended call + saved record id. Cleared when a new call starts.
   *  Used by the power dialer to associate dispositions with the record. */
  lastEndedCall: EndedCallInfo | null;
  /** Fires after a call has been logged against a campaign lead (step ticked +
   *  call counter incremented), so list views can refresh the right campaign. */
  lastLoggedCall: { leadId: string; funnelId: string; at: number } | null;

  // ── Audio device selection (mic / speaker) ─────────────────────────
  /** Available microphones / speakers (labels populate after mic permission). */
  audioInputDevices: AudioDeviceOption[];
  audioOutputDevices: AudioDeviceOption[];
  /** Currently selected device ids ("default" when unset). */
  selectedInputDeviceId: string | null;
  selectedOutputDeviceId: string | null;
  /** Whether the browser supports choosing the speaker (Chrome: yes). */
  outputSelectionSupported: boolean;
  setInputDevice: (deviceId: string) => Promise<void>;
  setOutputDevice: (deviceId: string) => Promise<void>;
  /** Re-enumerate devices and request mic permission so labels appear. */
  refreshAudioDevices: () => Promise<void>;

  // ── Incoming call (ringing, awaiting accept/reject) ────────────────
  /** A ringing inbound call the rep hasn't answered yet, or null. */
  incomingCall: IncomingCallInfo | null;
  /** Answer the ringing inbound call. */
  acceptIncoming: () => void;
  /** Decline the ringing inbound call. */
  rejectIncoming: () => void;
}

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
}

/** A pending inbound call shown in the ringing prompt before it's answered. */
export interface IncomingCallInfo {
  callId: string;
  /** The external caller's number. */
  fromNumber: string;
  /** The Leadey line the call came in on (E.164). */
  lineNumber: string;
  /** Friendly name of that line, if known. */
  lineName: string | null;
  /** Resolved caller identity (matched to a lead/contact by number), filled in
   *  shortly after the call starts ringing so the rep can see WHO is calling. */
  contactName?: string | null;
  companyName?: string | null;
  leadId?: string | null;
  funnelId?: string | null;
}
