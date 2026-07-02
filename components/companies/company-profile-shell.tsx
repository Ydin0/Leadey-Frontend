"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

import { useAuthReady } from "@/components/providers/auth-token-sync";
import { LeadTimeline } from "@/components/funnels/lead-view/lead-timeline";
import { LeadHiringRolesSection } from "@/components/funnels/lead-view/lead-hiring-roles-section";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyContactsPanel } from "./company-contacts-panel";
import { CompanyNoteComposer, type ComposerEnrollment } from "./company-note-composer";

import {
  getUniversalCompanyProfile,
  getCompanyTimeline,
  type UniversalCompanyProfile,
} from "@/lib/api/company-profile";
import {
  mapCompanyTimeline,
  appendCompanyTimeline,
  EMPTY_COMPANY_TIMELINE,
  type MappedCompanyTimeline,
  type TimelineItemMeta,
} from "@/lib/utils/company-timeline";
import { logLeadNote, updateLeadNote, deleteLeadNote } from "@/lib/api/funnels";
import type { FunnelLeadActivity } from "@/lib/types/funnel-focus";

/**
 * Universal company profile — one org-wide page per company: header +
 * campaign filter, the person layer (contacts across all campaigns), and the
 * merged cross-campaign activity timeline. Campaign/contact filters are
 * server-side (refetch, cursor resets); type pills stay client-side.
 */
export function CompanyProfileShell({ companyId }: { companyId: string }) {
  const isAuthReady = useAuthReady();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<UniversalCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [feed, setFeed] = useState<MappedCompanyTimeline>(EMPTY_COMPANY_TIMELINE);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters live in the URL (?funnel= / ?contact=) — the URL is the single
  // source of truth, so search deep links and same-segment navigations to a
  // different company always apply the new params (component state would
  // survive those navigations and go stale).
  const activeFunnelId = searchParams.get("funnel");
  const activeContactId = searchParams.get("contact");

  // Optimistic note overlays (same pattern as LeadView). Refs mirror the
  // delete/edit overlays so addNote's in-flight resolution can see actions
  // taken while the save was still pending.
  const [extraActivities, setExtraActivities] = useState<FunnelLeadActivity[]>([]);
  const [extraMeta, setExtraMeta] = useState<Record<string, TimelineItemMeta>>({});
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const editedNotesRef = useRef(editedNotes);
  editedNotesRef.current = editedNotes;
  const deletedNotesRef = useRef(deletedNotes);
  deletedNotesRef.current = deletedNotes;

  // Overlays belong to one company — clear them when navigating to another.
  useEffect(() => {
    setExtraActivities([]);
    setExtraMeta({});
    setEditedNotes({});
    setDeletedNotes(new Set());
  }, [companyId]);

  // Drops stale timeline responses when filters change mid-flight.
  const reqSeq = useRef(0);

  const syncUrl = useCallback(
    (funnelId: string | null, contactId: string | null) => {
      const params = new URLSearchParams();
      if (funnelId) params.set("funnel", funnelId);
      if (contactId) params.set("contact", contactId);
      const qs = params.toString();
      router.replace(`/dashboard/companies/${encodeURIComponent(companyId)}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, companyId],
  );

  // Profile (header, contacts, campaigns, hiring roles).
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUniversalCompanyProfile(companyId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load company");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, companyId]);

  // Timeline first page — refetches whenever a server-side filter changes.
  useEffect(() => {
    if (!isAuthReady) return;
    const seq = ++reqSeq.current;
    setFeed(EMPTY_COMPANY_TIMELINE);
    setNextCursor(null);
    setHasMore(false);
    getCompanyTimeline(companyId, {
      funnelId: activeFunnelId ?? undefined,
      contactId: activeContactId ?? undefined,
    })
      .then((page) => {
        if (reqSeq.current !== seq) return; // stale
        setFeed(mapCompanyTimeline(page.items));
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (reqSeq.current !== seq) return;
        console.error("Failed to load company timeline:", err);
      });
  }, [isAuthReady, companyId, activeFunnelId, activeContactId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const seq = reqSeq.current;
    setLoadingMore(true);
    try {
      const page = await getCompanyTimeline(companyId, {
        cursor: nextCursor,
        funnelId: activeFunnelId ?? undefined,
        contactId: activeContactId ?? undefined,
      });
      if (reqSeq.current !== seq) return; // filters changed mid-flight
      setFeed((acc) => appendCompanyTimeline(acc, mapCompanyTimeline(page.items)));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error("Failed to load older activity:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [companyId, nextCursor, loadingMore, activeFunnelId, activeContactId]);

  const setFunnelFilter = useCallback(
    (funnelId: string | null) => syncUrl(funnelId, activeContactId),
    [activeContactId, syncUrl],
  );

  const setContactFilter = useCallback(
    (contactId: string | null) => syncUrl(activeFunnelId, contactId),
    [activeFunnelId, syncUrl],
  );

  // ── Notes (campaign-level writes via the enrollment's per-lead endpoints) ──

  const composerEnrollments = useMemo<ComposerEnrollment[]>(() => {
    if (!profile) return [];
    const contacts = activeContactId
      ? profile.contacts.filter((c) => c.personKey === activeContactId)
      : profile.contacts;
    return contacts.flatMap((c) =>
      c.enrollments.map((e) => ({
        leadId: e.leadId,
        funnelId: e.funnelId,
        funnelName: e.funnelName,
        contactId: c.personKey,
        contactName: c.name,
        lastActivityAt: e.lastActivityAt ?? e.addedAt,
      })),
    );
  }, [profile, activeContactId]);

  const defaultEnrollmentLeadId = useMemo(() => {
    if (composerEnrollments.length === 0) return null;
    return [...composerEnrollments].sort((a, b) =>
      (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""),
    )[0].leadId;
  }, [composerEnrollments]);

  const addNote = useCallback(
    (text: string, enr: ComposerEnrollment) => {
      const tmpId = `tmp_${Date.now()}`;
      const meta: TimelineItemMeta = {
        funnelId: enr.funnelId,
        funnelName: enr.funnelName,
        leadId: enr.leadId,
        contactId: enr.contactId,
        contactName: enr.contactName,
      };
      const optimistic: FunnelLeadActivity = {
        id: tmpId,
        type: "note",
        summary: text,
        timestamp: new Date(),
        userInitials: "",
        ...meta,
      };
      setExtraActivities((prev) => [optimistic, ...prev]);
      setExtraMeta((prev) => ({ ...prev, [tmpId]: meta }));
      void logLeadNote(enr.funnelId, enr.leadId, text)
        .then(({ id }) => {
          // The user may have deleted or edited the optimistic note while the
          // save was in flight — those overlays are keyed by the tmp id, so
          // honor them against the real server id instead of silently
          // resurrecting the note by renaming it out from under them.
          if (deletedNotesRef.current.has(tmpId)) {
            setExtraActivities((prev) => prev.filter((a) => a.id !== tmpId));
            void deleteLeadNote(enr.funnelId, enr.leadId, id).catch((err) =>
              console.error("Failed to delete note:", err),
            );
            return;
          }
          const editedText = editedNotesRef.current[tmpId];
          setExtraActivities((prev) => prev.map((a) => (a.id === tmpId ? { ...a, id } : a)));
          setExtraMeta((prev) => {
            const { [tmpId]: m, ...rest } = prev;
            return { ...rest, [id]: m ?? meta };
          });
          if (editedText !== undefined) {
            setEditedNotes((prev) => {
              const { [tmpId]: t, ...rest } = prev;
              return { ...rest, [id]: t };
            });
            void updateLeadNote(enr.funnelId, enr.leadId, id, editedText).catch((err) =>
              console.error("Failed to update note:", err),
            );
          }
        })
        .catch((err) => {
          console.error("Failed to save note:", err);
          setExtraActivities((prev) => prev.filter((a) => a.id !== tmpId));
        });
    },
    [],
  );

  const resolveNoteTarget = useCallback(
    (activityId: string): { funnelId: string; leadId: string } | null => {
      const meta = extraMeta[activityId] ?? feed.itemMeta[activityId];
      return meta?.funnelId && meta?.leadId ? { funnelId: meta.funnelId, leadId: meta.leadId } : null;
    },
    [extraMeta, feed.itemMeta],
  );

  const editNote = useCallback(
    (activityId: string, text: string) => {
      setEditedNotes((prev) => ({ ...prev, [activityId]: text }));
      setExtraActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, summary: text } : a)));
      if (activityId.startsWith("tmp_")) return;
      const target = resolveNoteTarget(activityId);
      if (!target) return;
      void updateLeadNote(target.funnelId, target.leadId, activityId, text).catch((err) =>
        console.error("Failed to update note:", err),
      );
    },
    [resolveNoteTarget],
  );

  const deleteNote = useCallback(
    (activityId: string) => {
      setDeletedNotes((prev) => new Set(prev).add(activityId));
      if (activityId.startsWith("tmp_")) return;
      const target = resolveNoteTarget(activityId);
      if (!target) return;
      void deleteLeadNote(target.funnelId, target.leadId, activityId).catch((err) =>
        console.error("Failed to delete note:", err),
      );
    },
    [resolveNoteTarget],
  );

  // ── Timeline inputs (server feed + optimistic overlays) ──
  const activities = useMemo(() => {
    const serverIds = new Set(feed.activities.map((a) => a.id));
    return [...extraActivities.filter((a) => !serverIds.has(a.id)), ...feed.activities]
      .filter((a) => !deletedNotes.has(a.id))
      .map((a) => (editedNotes[a.id] ? { ...a, summary: editedNotes[a.id] } : a));
  }, [feed.activities, extraActivities, deletedNotes, editedNotes]);

  const itemMeta = useMemo(() => ({ ...feed.itemMeta, ...extraMeta }), [feed.itemMeta, extraMeta]);

  const activeContact = activeContactId
    ? profile?.contacts.find((c) => c.personKey === activeContactId)
    : undefined;

  // ── Render ──

  if (loading || !isAuthReady) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-center text-[13px] text-ink-muted">
        Loading company profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-center">
        <p className="text-[13px] text-signal-red-text mb-3">{error || "Company not found"}</p>
        <Link
          href="/dashboard/companies"
          className="text-[12px] font-medium text-ink-secondary hover:text-ink transition-colors"
        >
          ← All companies
        </Link>
      </div>
    );
  }

  const { company, campaigns, contacts, hiringRoles } = profile;

  return (
    <div className="-m-6 h-[calc(100%+3rem)] flex flex-col bg-page">
      <CompanyProfileHeader
        company={company}
        campaigns={campaigns}
        activeFunnelId={activeFunnelId}
        onFunnelFilter={setFunnelFilter}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left column — About + the person layer + hiring signals */}
        <aside className="w-[364px] shrink-0 border-r border-border-subtle overflow-y-auto px-[18px] py-4 space-y-4">
          {company.description && (
            <div className="rounded-[14px] border border-border-subtle bg-surface p-3.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">About</span>
              <p className="text-[12px] text-ink-secondary leading-relaxed mt-1.5 line-clamp-6">
                {company.description}
              </p>
            </div>
          )}

          <CompanyContactsPanel
            contacts={contacts}
            activeContactId={activeContactId}
            onContactSelect={setContactFilter}
          />

          {hiringRoles.length > 0 && (
            <LeadHiringRolesSection funnelId="" leadId={company.id} seedRoles={hiringRoles} />
          )}
        </aside>

        {/* Right — the merged cross-campaign timeline */}
        <section className="flex-1 min-w-0">
          {contacts.length === 0 ? (
            <div className="max-w-[560px] mx-auto pt-12 px-6">
              <EmptyState
                icon={Building2}
                title="No contacts yet"
                description="This company has no contacts in any campaign. Import leads or add contacts from a campaign to start building its history."
              />
            </div>
          ) : (
            <LeadTimeline
              activities={activities}
              callRecords={feed.callRecords}
              emailMessages={feed.emailMessages}
              onAddNote={() => {}}
              onEditNote={editNote}
              onDeleteNote={deleteNote}
              composerSlot={
                <CompanyNoteComposer
                  enrollments={composerEnrollments}
                  defaultLeadId={defaultEnrollmentLeadId}
                  onAdd={addNote}
                />
              }
              itemMeta={itemMeta}
              filterContactName={activeContact?.name ?? null}
              onClearFilter={() => setContactFilter(null)}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
            />
          )}
        </section>
      </div>
    </div>
  );
}
