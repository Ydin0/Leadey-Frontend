"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Eye,
  Pencil,
  Braces,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_VARIABLES,
  renderPersonalized,
  type PersonalizationLead,
} from "@/lib/utils/personalize";

interface RichEmailEditorProps {
  /** HTML value. */
  value: string;
  onChange: (html: string) => void;
  /** Lead used to resolve {{variables}} in the live preview. */
  previewLead?: PersonalizationLead;
  senderName?: string;
  placeholder?: string;
  minHeight?: number;
}

export function RichEmailEditor({
  value,
  onChange,
  previewLead,
  senderName,
  placeholder = "Write your email…",
  minHeight = 200,
}: RichEmailEditorProps) {
  const [preview, setPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-email outline-none text-[13px] leading-relaxed text-ink px-3 py-2.5",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. when a template is applied) without
  // clobbering the cursor while the user is typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="rounded-[10px] border border-border-subtle bg-surface"
        style={{ minHeight }}
      />
    );
  }

  function insertVariable(key: string) {
    editor!.chain().focus().insertContent(`{{${key}}}`).run();
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (url) {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor!.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-subtle bg-section/40">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={13} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={13} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bulleted list"
        >
          <List size={13} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered size={13} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link") || linkOpen}
          onClick={() => {
            setLinkUrl(editor.getAttributes("link").href || "");
            setLinkOpen((v) => !v);
          }}
          title="Link"
        >
          <Link2 size={13} strokeWidth={2} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border-subtle mx-1" />

        <VariableMenu onInsert={insertVariable} />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
            preview
              ? "bg-ink text-on-ink"
              : "text-ink-secondary hover:bg-hover",
          )}
        >
          {preview ? <Pencil size={11} /> : <Eye size={11} />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Inline link input */}
      {linkOpen && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border-subtle bg-section/20">
          <Link2 size={12} className="text-ink-muted shrink-0" />
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://…"
            className="flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={applyLink} className="p-1 rounded text-signal-green-text hover:bg-hover">
            <Check size={12} />
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} className="p-1 rounded text-ink-faint hover:bg-hover">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Editor / Preview */}
      {preview ? (
        <div
          className="prose-email text-[13px] leading-relaxed text-ink px-3 py-2.5"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{
            __html: renderPersonalized(value, previewLead ?? {}, { senderName }),
          }}
        />
      ) : (
        <div
          className="relative"
          style={{ minHeight }}
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent editor={editor} />
          {editor.isEmpty && (
            <div className="absolute top-2.5 left-3 text-[13px] text-ink-faint pointer-events-none">
              {placeholder}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
        active ? "bg-ink text-on-ink" : "text-ink-secondary hover:bg-hover",
      )}
    >
      {children}
    </button>
  );
}

function VariableMenu({ onInsert }: { onInsert: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 h-7 rounded-md text-[10px] font-medium text-signal-blue-text bg-signal-blue/10 hover:bg-signal-blue/20 transition-colors"
        title="Insert personalization variable"
      >
        <Braces size={11} />
        Variable
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-surface rounded-[10px] border border-border-subtle shadow-lg py-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                onInsert(v.key);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-hover transition-colors flex items-center justify-between"
            >
              <span className="text-ink">{v.label}</span>
              <span className="text-[10px] text-ink-faint font-mono">{`{{${v.key}}}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Editor };
