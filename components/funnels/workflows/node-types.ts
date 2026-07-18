import {
  Zap, Mail, MessageSquare, MessageCircle, Linkedin, Phone, Clock, Hourglass, GitBranch,
  Split, Flag, Tag, Pencil, UserPlus, Webhook, Target, LogOut, Briefcase, type LucideIcon,
} from "lucide-react";
import type { WorkflowNodeType } from "@/lib/types/workflow";

export interface NodeTypeDef {
  type: WorkflowNodeType;
  label: string;
  kicker: string;
  icon: LucideIcon;
  /** Output ports. Most nodes have a single "out"; branches differ. */
  ports: string[];
  /** Terminal nodes end the enrollment and have no outputs. */
  terminal?: boolean;
  /** The trigger is the fixed entry and can't be deleted. */
  fixed?: boolean;
  defaultData: () => Record<string, unknown>;
}

export const NODE_TYPES: Record<WorkflowNodeType, NodeTypeDef> = {
  trigger:   { type: "trigger",   label: "Trigger",          kicker: "ENTRY",     icon: Zap,          ports: ["out"], fixed: true, defaultData: () => ({ label: "Lead enters campaign", sub: "" }) },
  email:     { type: "email",     label: "Send Email",       kicker: "MESSAGING", icon: Mail,         ports: ["out"], defaultData: () => ({ from: "", subject: "", body: "" }) },
  sms:       { type: "sms",       label: "Send SMS",         kicker: "MESSAGING", icon: MessageSquare,ports: ["out"], defaultData: () => ({ message: "" }) },
  whatsapp:  { type: "whatsapp",  label: "Send WhatsApp",    kicker: "MESSAGING", icon: MessageCircle,ports: ["out"], defaultData: () => ({ message: "" }) },
  linkedin:  { type: "linkedin",  label: "LinkedIn",         kicker: "MESSAGING", icon: Linkedin,     ports: ["out"], defaultData: () => ({ action: "connection", senderMode: "actor", message: "" }) },
  call:      { type: "call",      label: "Call Task",        kicker: "MESSAGING", icon: Phone,        ports: ["out"], defaultData: () => ({ title: "Call lead", script: "" }) },
  wait:      { type: "wait",      label: "Wait / Delay",     kicker: "TIMING",    icon: Clock,        ports: ["out"], defaultData: () => ({ amount: 2, unit: "days" }) },
  waitevent: { type: "waitevent", label: "Wait for Event",   kicker: "TIMING",    icon: Hourglass,    ports: ["out"], defaultData: () => ({ event: "replied", amount: 3, unit: "days" }) },
  condition: { type: "condition", label: "Condition",        kicker: "LOGIC",     icon: GitBranch,    ports: ["yes", "no"], defaultData: () => ({ label: "Has replied?", field: "replied" }) },
  abtest:    { type: "abtest",    label: "A/B Split",        kicker: "LOGIC",     icon: Split,        ports: ["a", "b"], defaultData: () => ({ splitA: 50 }) },
  status:    { type: "status",    label: "Change Status",    kicker: "ACTION",    icon: Flag,         ports: ["out"], defaultData: () => ({ to: "Contacted" }) },
  tag:       { type: "tag",       label: "Add / Remove Tag", kicker: "ACTION",    icon: Tag,          ports: ["out"], defaultData: () => ({ mode: "add", tag: "" }) },
  field:     { type: "field",     label: "Update Field",     kicker: "ACTION",    icon: Pencil,       ports: ["out"], defaultData: () => ({ field: "", op: "set", value: "" }) },
  assign:    { type: "assign",    label: "Assign Owner",     kicker: "ACTION",    icon: UserPlus,     ports: ["out"], defaultData: () => ({ owner: "Round robin" }) },
  opportunity: { type: "opportunity", label: "Move Opportunity", kicker: "ACTION", icon: Briefcase,   ports: ["out"], defaultData: () => ({ pipelineId: "", stageId: "", pipelineName: "", stageLabel: "" }) },
  webhook:   { type: "webhook",   label: "Webhook",          kicker: "ACTION",    icon: Webhook,      ports: ["out"], defaultData: () => ({ method: "POST", url: "" }) },
  goal:      { type: "goal",      label: "Goal Reached",     kicker: "EXIT",      icon: Target,       ports: [], terminal: true, defaultData: () => ({ label: "Goal reached" }) },
  end:       { type: "end",       label: "Exit Workflow",    kicker: "EXIT",      icon: LogOut,       ports: [], terminal: true, defaultData: () => ({ label: "Exit workflow" }) },
};

export const PALETTE_GROUPS: { name: string; types: WorkflowNodeType[] }[] = [
  { name: "Messaging", types: ["email", "sms", "whatsapp", "linkedin", "call"] },
  { name: "Timing",    types: ["wait", "waitevent"] },
  { name: "Logic",     types: ["condition", "abtest"] },
  { name: "Action",    types: ["status", "tag", "field", "assign", "opportunity", "webhook"] },
  { name: "Exit",      types: ["goal", "end"] },
];

export const PORT_LABEL: Record<string, string> = { out: "", yes: "Yes", no: "No", a: "A", b: "B" };

export const NODE_W = 256;
export const NODE_H = 92;

/** One-line summary shown on the node card for a given step. */
export function nodeSummary(type: WorkflowNodeType, data: Record<string, unknown>): string {
  const s = (k: string) => (data?.[k] != null ? String(data[k]) : "");
  switch (type) {
    case "trigger": return s("sub") || s("label") || "Lead enters campaign";
    case "email": return s("subject") || "(no subject)";
    case "sms": return s("message") || "(empty message)";
    case "whatsapp": return s("message") || "(empty message)";
    case "linkedin": {
      const a = s("action") || s("ltype") || "connection";
      return a === "message" ? "Send message" : a === "visit" ? "Visit profile" : "Connection request";
    }
    case "call": return s("title") || "Call task";
    case "wait": return `${s("amount") || "0"} ${s("unit") || "days"}`;
    case "waitevent": return `until ${s("event") || "reply"}`;
    case "condition": return s("label") || "Branch";
    case "abtest": return `${s("splitA") || 50}% / ${100 - Number(s("splitA") || 50)}%`;
    case "status": return `→ ${s("to") || "Contacted"}`;
    case "tag": return `${s("mode") || "add"} “${s("tag")}”`;
    case "field": return `${s("op") || "set"} ${s("field")}`;
    case "assign": return s("owner") || "Round robin";
    case "opportunity": {
      const stage = s("stageLabel");
      const pipe = s("pipelineName");
      if (!stage) return "Pick a stage";
      return pipe ? `→ ${pipe}: ${stage}` : `→ ${stage}`;
    }
    case "webhook": return `${s("method") || "POST"} ${s("url")}`;
    case "goal": return s("label") || "Goal reached";
    case "end": return s("label") || "Exit workflow";
    default: return "";
  }
}
