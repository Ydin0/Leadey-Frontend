"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Linkedin, Phone } from "lucide-react";
import type { FunnelLeadContact } from "@/lib/types/funnel-focus";

interface LeadContactsPanelProps {
  contacts: FunnelLeadContact[];
}

export function LeadContactsPanel({ contacts }: LeadContactsPanelProps) {
  const [expanded, setExpanded] = useState(true);

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
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-[11px] text-ink hover:text-signal-blue-text transition-colors block mt-0.5"
                    >
                      {contact.phone}
                    </a>
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
                    <a href={`tel:${contact.phone}`} title={contact.phone} className="p-1 rounded-md hover:bg-section transition-colors">
                      <Phone size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                    </a>
                  ) : (
                    <span title="No phone number" className="p-1 rounded-md relative cursor-not-allowed">
                      <Phone size={14} strokeWidth={1.5} className="text-ink-faint/30" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-px bg-signal-red-text/40 rotate-[-45deg]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
