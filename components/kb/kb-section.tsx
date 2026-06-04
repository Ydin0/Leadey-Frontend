"use client";

import React from "react";
import { Icon } from "@/components/team/icon";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { KBHome } from "./kb-home";
import { KBOffer } from "./kb-offer";
import { KBLesson } from "./kb-lesson";
import { OfferModal, ModuleModal, LessonModal, AssignMembersModal } from "./kb-manage";
import { setOffers, progress, OFFER_MAP } from "@/lib/kb/kb-data";
import type { Offer, Lesson, KnowledgeBaseData } from "@/lib/types/kb";
import {
  getKnowledgeBase, createOffer, updateOffer, deleteOffer,
  addModule, updateModule, deleteModule,
  addLesson, updateLesson, deleteLesson, setOfferAssignments,
  type LessonInput,
} from "@/lib/api/kb";

type View = { name: "home" } | { name: "offer"; id: string } | { name: "lesson"; id: string };
type Modal =
  | { kind: "offer"; edit?: Offer }
  | { kind: "module"; offerId: string; edit?: { id: string; title: string } }
  | { kind: "lesson"; offerId: string; moduleId: string; edit?: Lesson }
  | { kind: "assign"; offer: Offer }
  | null;

export function KBSection() {
  const isAuthReady = useAuthReady();
  const [data, setData] = React.useState<KnowledgeBaseData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<View>({ name: "home" });
  const [manage, setManage] = React.useState(false);
  const [modal, setModal] = React.useState<Modal>(null);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const tick = () => force();

  const refresh = React.useCallback(async () => {
    const d = await getKnowledgeBase();
    setOffers(d.offers);
    progress.seed(d.progress.done);
    setData(d);
    force();
  }, []);

  React.useEffect(() => {
    if (!isAuthReady) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [isAuthReady, refresh]);

  const canManage = !!data?.canManage;
  const openOffer = (id: string) => { setView({ name: "offer", id }); window.scrollTo(0, 0); };
  const openLesson = (id: string) => { setView({ name: "lesson", id }); window.scrollTo(0, 0); };
  const home = () => { setView({ name: "home" }); window.scrollTo(0, 0); };
  const assignedUserIds = (offerId: string) =>
    (data?.assignments || []).filter((a) => a.offerId === offerId).map((a) => a.userId);

  // ── Mutations (all admin) ──
  async function saveOffer(d: { name: string; tagline: string; category: string; level: string; accent: string; about: string }) {
    if (modal?.kind === "offer" && modal.edit) {
      await updateOffer(modal.edit.id, d);
      setModal(null); await refresh();
    } else {
      const o = await createOffer(d);
      setModal(null); await refresh(); openOffer(o.id);
    }
  }
  async function saveModule(title: string) {
    if (modal?.kind !== "module") return;
    if (modal.edit) await updateModule(modal.edit.id, title);
    else await addModule(modal.offerId, title);
    setModal(null); await refresh();
  }
  async function saveLesson(d: LessonInput) {
    if (modal?.kind !== "lesson") return;
    if (modal.edit) await updateLesson(modal.edit.id, d);
    else await addLesson(modal.moduleId, d);
    setModal(null); await refresh();
  }
  async function saveAssign(userIds: string[]) {
    if (modal?.kind !== "assign") return;
    await setOfferAssignments(modal.offer.id, userIds);
    setModal(null); await refresh();
  }
  async function removeOffer(offerId: string) {
    if (!confirm("Delete this offer and all its modules and lessons? This cannot be undone.")) return;
    await deleteOffer(offerId);
    home(); await refresh();
  }
  async function removeModule(moduleId: string) {
    if (!confirm("Delete this module and its lessons?")) return;
    await deleteModule(moduleId); await refresh();
  }
  async function removeLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    await deleteLesson(lessonId); await refresh();
  }

  if (loading) {
    return (
      <div className="team-root fade">
        <div className="row" style={{ gap: 10, color: "var(--fg-muted)", fontSize: 13, padding: 40, justifyContent: "center" }}>
          <Icon name="loader" size={16} /> Loading your knowledge base…
        </div>
      </div>
    );
  }

  return (
    <div className="team-root fade">
      {view.name === "home" ? (
        <div className="between" style={{ marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Knowledge Base</h1>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
              {canManage ? "Your learning hub — build offers, playbooks & onboarding, and assign them to reps." : "Your learning hub — the offers and playbooks assigned to you."}
            </p>
          </div>
          {canManage && (
            <div className="row" style={{ gap: 10 }}>
              {manage && <button className="pill pill-soft" onClick={() => setModal({ kind: "offer" })}><Icon name="folder-plus" size={13} />New offer</button>}
              <button className="pill" onClick={() => setManage((v) => !v)} style={{ background: manage ? "var(--accent)" : "var(--section)", color: manage ? "var(--on-accent)" : "var(--fg2)" }}>
                <Icon name={manage ? "check" : "settings-2"} size={13} />{manage ? "Done managing" : "Manage"}
              </button>
            </div>
          )}
        </div>
      ) : view.name === "offer" ? (
        <div className="between" style={{ marginBottom: 18 }}>
          <button className="row" onClick={home} style={{ gap: 7, fontSize: 12, color: "var(--fg-muted)" }}><Icon name="arrow-left" size={14} />Knowledge Base</button>
          {canManage && (
            <button className="pill" onClick={() => setManage((v) => !v)} style={{ background: manage ? "var(--accent)" : "var(--section)", color: manage ? "var(--on-accent)" : "var(--fg2)" }}>
              <Icon name={manage ? "check" : "settings-2"} size={13} />{manage ? "Done managing" : "Manage"}
            </button>
          )}
        </div>
      ) : null}

      {view.name === "home" && (
        <KBHome
          onOpenOffer={openOffer}
          onOpenLesson={openLesson}
          canManage={canManage}
          onNewOffer={() => { setManage(true); setModal({ kind: "offer" }); }}
          onManage={() => setManage(true)}
          perRow={3}
        />
      )}
      {view.name === "offer" && OFFER_MAP[view.id] && (
        <KBOffer
          offerId={view.id}
          manage={manage && canManage}
          onOpenLesson={openLesson}
          onAddModule={(oid) => setModal({ kind: "module", offerId: oid })}
          onAddLesson={(oid, mid) => setModal({ kind: "lesson", offerId: oid, moduleId: mid })}
          onEditOffer={(o) => setModal({ kind: "offer", edit: o })}
          onDeleteOffer={(oid) => void removeOffer(oid)}
          onAssign={(o) => setModal({ kind: "assign", offer: o })}
          onEditModule={(mid, title) => setModal({ kind: "module", offerId: view.id, edit: { id: mid, title } })}
          onDeleteModule={(mid) => void removeModule(mid)}
          onEditLesson={(oid, mid, l) => setModal({ kind: "lesson", offerId: oid, moduleId: mid, edit: l })}
          onDeleteLesson={(lid) => void removeLesson(lid)}
        />
      )}
      {view.name === "lesson" && (
        <KBLesson lessonId={view.id} onOpenLesson={openLesson} onBackOffer={openOffer} onBackHome={home} tick={tick} />
      )}

      {modal?.kind === "offer" && (
        <OfferModal initial={modal.edit} onClose={() => setModal(null)} onSave={saveOffer} />
      )}
      {modal?.kind === "module" && (
        <ModuleModal initial={modal.edit?.title} onClose={() => setModal(null)} onSave={saveModule} />
      )}
      {modal?.kind === "lesson" && (
        <LessonModal initial={modal.edit} onClose={() => setModal(null)} onSave={saveLesson} />
      )}
      {modal?.kind === "assign" && (
        <AssignMembersModal offer={modal.offer} assignedUserIds={assignedUserIds(modal.offer.id)} onClose={() => setModal(null)} onSave={saveAssign} />
      )}
    </div>
  );
}
