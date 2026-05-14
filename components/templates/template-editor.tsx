"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Mail, Linkedin, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariableInserter } from "./variable-inserter";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARIABLES } from "@/lib/types/template";
import type { TemplateChannel, TemplateCategory } from "@/lib/types/template";

interface TemplateEditorProps {
  name: string;
  channel: TemplateChannel;
  category: TemplateCategory | null;
  subject: string;
  body: string;
  tags: string[];
  onNameChange: (value: string) => void;
  onChannelChange: (value: TemplateChannel) => void;
  onCategoryChange: (value: TemplateCategory | null) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
}

const SAMPLE_DATA: Record<string, string> = {
  first_name: "James",
  last_name: "Wilson",
  full_name: "James Wilson",
  company: "Acme Corp",
  title: "VP of Engineering",
  email: "james@acme.com",
  domain: "acme.com",
  sender_name: "You",
};

function renderPreview(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] || `{{${key}}}`);
}

export function TemplateEditor({
  name, channel, category, subject, body, tags,
  onNameChange, onChannelChange, onCategoryChange, onSubjectChange, onBodyChange, onTagsChange,
}: TemplateEditorProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const insertVariable = useCallback((variable: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      onBodyChange(body + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    onBodyChange(newBody);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    });
  }, [body, onBodyChange]);

  function addTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        onTagsChange([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  const previewBody = useMemo(() => renderPreview(body), [body]);
  const previewSubject = useMemo(() => renderPreview(subject), [subject]);

  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Cold Outreach v2"
          className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
        />
      </div>

      {/* Channel + Category row */}
      <div className="flex items-start gap-4">
        {/* Channel toggle */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Channel</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChannelChange("email")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium border transition-colors",
                channel === "email"
                  ? "bg-signal-blue/10 text-signal-blue-text border-signal-blue-text/20"
                  : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
              )}
            >
              <Mail size={12} />
              Email
            </button>
            <button
              type="button"
              onClick={() => onChannelChange("linkedin")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium border transition-colors",
                channel === "linkedin"
                  ? "bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20"
                  : "bg-surface text-ink-muted border-border-subtle hover:bg-hover"
              )}
            >
              <Linkedin size={12} />
              LinkedIn
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="relative">
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Category</label>
          <button
            type="button"
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium border border-border-subtle bg-surface text-ink-secondary hover:bg-hover transition-colors min-w-[120px]"
          >
            {category ? TEMPLATE_CATEGORIES.find((c) => c.value === category)?.label || category : "Select..."}
            <ChevronDown size={10} className="ml-auto" />
          </button>
          {showCategoryMenu && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-20 py-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { onCategoryChange(cat.value); setShowCategoryMenu(false); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors",
                    category === cat.value ? "font-medium text-ink" : "text-ink-secondary"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject (email only) */}
      {channel === "email" && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. Quick question about {{company}}"
            className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
      )}

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            {channel === "email" ? "Email Body" : "Message"}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-ink-faint">{body.length} chars</span>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "text-[10px] font-medium transition-colors",
                showPreview ? "text-signal-blue-text" : "text-ink-muted hover:text-ink"
              )}
            >
              {showPreview ? "Editor" : "Preview"}
            </button>
          </div>
        </div>

        <VariableInserter onInsert={insertVariable} />

        <div className="mt-2">
          {showPreview ? (
            <div className="w-full min-h-[200px] px-3 py-2 rounded-[8px] bg-section/50 border border-border-subtle text-[12px] text-ink leading-relaxed whitespace-pre-wrap">
              {channel === "email" && previewSubject && (
                <div className="font-medium mb-2 pb-2 border-b border-border-subtle">{previewSubject}</div>
              )}
              {previewBody || <span className="text-ink-faint">Nothing to preview</span>}
            </div>
          ) : (
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder={channel === "email"
                ? "Hi {{first_name}},\n\nI noticed {{company}} is..."
                : "Hi {{first_name}}, I saw that {{company}} is..."
              }
              rows={10}
              className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default resize-y leading-relaxed"
            />
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">Tags</label>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-section text-ink-secondary">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-signal-red-text transition-colors">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Type a tag and press Enter..."
          className="w-full px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
        />
      </div>
    </div>
  );
}
