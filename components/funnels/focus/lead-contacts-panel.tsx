"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Linkedin, Phone, Ban, Loader2 } from "lucide-react";
import type { FunnelLeadContact } from "@/lib/types/funnel-focus";

interface LeadContactsPanelProps {
  contacts: FunnelLeadContact[];
  /** Start a Twilio call to this number via the in-app dialer. */
  onCall?: (phone: string, contactName?: string) => void;
  /** Mark this single person as Do-Not-Call (removes them from all campaigns). */
  onDnc?: (contact: FunnelLeadContact) => Promise<void> | void;
}

export function LeadContactsPanel({ contacts, onCall, onDnc }: LeadContactsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dncingId, setDncingId] = useState<string | null>(null);

  async function handleDnc(contact: FunnelLeadContact) {
    if (!onDnc) return;
    setDncingId(contact.id);
    try {
      await onDnc(contact);
    } finally {
      setDncingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="border-b border-border-subtle pb-4 mb-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 mb-3 group"
      >
        {expanded ? (
          <ChevronDown size={12} strokeWidth={2} className="text-ink-muted" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} className="text-ink-muted" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Contacts
        </span>
        <span className="text-[10px] font-medium text-ink-muted ml-1">{contacts.length}</span>
      </button>
      {expanded && (
        <div className="space-y-0">
          {contacts.map((contact, i) => (
            <div
              key={contact.id}
              className={i < contacts.length - 1 ? "border-b border-border-subtle pb-3 mb-3" : ""}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-ink">{contact.name}</div>
                  <div className="text-[11px] text-ink-muted">{contact.title}</div>
                  {contact.phone && (
                    onCall ? (
                      <button
                        onClick={() => onCall(contact.phone!, contact.name)}
                        className="text-[11px] text-ink hover:text-signal-green-text transition-colors block mt-0.5 text-left"
                        title="Call via dialer"
                      >
                        {contact.phone}
                      </button>
                    ) : (
                      <a href={`tel:${contact.phone}`} className="text-[11px] text-ink hover:text-signal-blue-text transition-colors block mt-0.5">
                        {contact.phone}
                      </a>
                    )
                  )}
                  {contact.email && (
                    <div className="text-[11px] text-ink-secondary mt-0.5">{contact.email}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {/* Email */}
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} title={contact.email} className="p-1 rounded-md hover:bg-section transition-colors">
                      <Mail size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                    </a>
                  ) : (
                    <span title="No email" className="p-1 rounded-md relative cursor-not-allowed">
                      <Mail size={14} strokeWidth={1.5} className="text-ink-faint/30" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-px bg-signal-red-text/40 rotate-[-45deg]" />
                    </span>
                  )}

                  {/* LinkedIn */}
                  {contact.linkedinUrl ? (
                    <a
                      href={contact.linkedinUrl.startsWith("http") ? contact.linkedinUrl : `https://www.linkedin.com/in/${contact.linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open LinkedIn"
                      className="p-1 rounded-md hover:bg-[#0A66C2]/10 transition-colors"
                    >
                      <Linkedin size={14} strokeWidth={1.5} className="text-[#0A66C2]" />
                    </a>
                  ) : (
                    <span title="No LinkedIn" className="p-1 rounded-md relative cursor-not-allowed">
                      <Linkedin size={14} strokeWidth={1.5} className="text-ink-faint/30" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-px bg-signal-red-text/40 rotate-[-45deg]" />
                    </span>
                  )}

                  {/* Phone */}
                  {contact.phone ? (
                    onCall ? (
                      <button onClick={() => onCall(contact.phone!, contact.name)} title={`Call ${contact.phone}`} className="p-1 rounded-md hover:bg-signal-green/10 transition-colors">
                        <Phone size={14} strokeWidth={1.5} className="text-signal-green-text" />
                      </button>
                    ) : (
                      <a href={`tel:${contact.phone}`} title={contact.phone} className="p-1 rounded-md hover:bg-section transition-colors">
                        <Phone size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                      </a>
                    )
                  ) : (
                    <span title="No phone number" className="p-1 rounded-md relative cursor-not-allowed">
                      <Phone size={14} strokeWidth={1.5} className="text-ink-faint/30" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-px bg-signal-red-text/40 rotate-[-45deg]" />
                    </span>
                  )}

                  {/* Do Not Call (compliance) */}
                  {onDnc && (
                    <button
                      onClick={() => setConfirmId(confirmId === contact.id ? null : contact.id)}
                      title="Mark Do Not Call — removes this person from all campaigns"
                      className="p-1 rounded-md hover:bg-signal-red/10 transition-colors"
                    >
                      <Ban size={14} strokeWidth={1.5} className="text-ink-faint hover:text-signal-red-text" />
                    </button>
                  )}
                </div>
              </div>

              {/* DNC confirmation */}
              {confirmId === contact.id && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
                  <span className="text-[10px] text-signal-red-text leading-snug">
                    Mark <strong>{contact.name}</strong> Do-Not-Call and remove them from every campaign?
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={dncingId === contact.id}
                      className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDnc(contact)}
                      disabled={dncingId === contact.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 transition-colors disabled:opacity-50"
                    >
                      {dncingId === contact.id ? <Loader2 size={9} className="animate-spin" /> : <Ban size={9} />}
                      Confirm DNC
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
