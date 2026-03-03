"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, MessageSquare, Phone } from "lucide-react";
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
                  {contact.email && (
                    <button className="p-1 rounded-md hover:bg-section transition-colors">
                      <Mail size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                    </button>
                  )}
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-section transition-colors"
                    >
                      <MessageSquare size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-1 rounded-md hover:bg-section transition-colors"
                    >
                      <Phone size={14} strokeWidth={1.5} className="text-ink-faint hover:text-ink" />
                    </a>
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
