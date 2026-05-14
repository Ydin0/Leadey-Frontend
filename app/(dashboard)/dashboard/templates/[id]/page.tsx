"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { TemplateEditor } from "@/components/templates/template-editor";
import { getTemplate, createTemplate, updateTemplate, deleteTemplate } from "@/lib/api/templates";
import type { TemplateChannel, TemplateCategory } from "@/lib/types/template";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<TemplateChannel>("email");
  const [category, setCategory] = useState<TemplateCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const loadTemplate = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const data = await getTemplate(id);
      setName(data.name);
      setChannel(data.channel);
      setCategory(data.category);
      setSubject(data.subject || "");
      setBody(data.body);
      setTags(data.tags);
    } catch (err) {
      console.error("Failed to load template:", err);
      router.push("/dashboard/templates");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, router]);

  useEffect(() => {
    if (!isAuthReady) return;
    loadTemplate();
  }, [isAuthReady, loadTemplate]);

  async function handleSave() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await createTemplate({ name, channel, category, subject: channel === "email" ? subject : undefined, body, tags });
        router.push(`/dashboard/templates/${created.id}`);
        router.refresh();
      } else {
        await updateTemplate(id, { name, channel, category, subject: channel === "email" ? subject : null, body, tags });
      }
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTemplate(id);
      router.push("/dashboard/templates");
    } catch (err) {
      console.error("Failed to delete template:", err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const canSave = name.trim().length > 0 && body.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/templates"
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to Templates
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-semibold text-ink">
            {isNew ? "New Template" : "Edit Template"}
          </h1>
          {!isNew && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
              title="Delete template"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <TemplateEditor
        name={name}
        channel={channel}
        category={category}
        subject={subject}
        body={body}
        tags={tags}
        onNameChange={setName}
        onChannelChange={setChannel}
        onCategoryChange={setCategory}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
        onTagsChange={setTags}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pb-8">
        <Link
          href="/dashboard/templates"
          className="px-5 py-2 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2 rounded-[20px] text-[11px] font-medium transition-colors",
            canSave && !saving
              ? "bg-ink text-on-ink hover:bg-ink/90"
              : "bg-section text-ink-faint cursor-not-allowed"
          )}
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {isNew ? "Create Template" : "Save Changes"}
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-[14px] font-semibold text-ink mb-2">Delete template?</h3>
            <p className="text-[12px] text-ink-secondary mb-5">
              This will permanently delete <span className="font-medium text-ink">{name}</span>. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 size={11} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
