"use client";

import React from "react";
import { Icon } from "@/components/team/icon";
import { KBHome } from "./kb-home";
import { KBOffer } from "./kb-offer";
import { KBLesson } from "./kb-lesson";
import { OfferModal, ModuleModal, LessonModal } from "./kb-manage";
import { addOffer, addModule, addLesson, progress } from "@/lib/kb/kb-data";

type View = { name: "home" } | { name: "offer"; id: string } | { name: "lesson"; id: string };
type Modal =
  | { kind: "offer" }
  | { kind: "module"; offerId: string }
  | { kind: "lesson"; offerId: string; moduleId: string }
  | null;

export function KBSection() {
  const [view, setView] = React.useState<View>({ name: "home" });
  const [manage, setManage] = React.useState(false);
  const [modal, setModal] = React.useState<Modal>(null);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const tick = () => force();

  // Load persisted progress after mount (SSR-safe).
  React.useEffect(() => { progress.hydrate(); force(); }, []);

  const openOffer = (id: string) => { setView({ name: "offer", id }); window.scrollTo(0, 0); };
  const openLesson = (id: string) => { setView({ name: "lesson", id }); window.scrollTo(0, 0); };
  const home = () => { setView({ name: "home" }); window.scrollTo(0, 0); };

  return (
    <div className="team-root fade">
      {view.name === "home" ? (
        <div className="between" style={{ marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Knowledge Base</h1>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Your learning hub — offers, playbooks &amp; onboarding for every rep.</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {manage && <button className="pill pill-soft" onClick={() => setModal({ kind: "offer" })}><Icon name="folder-plus" size={13} />New offer</button>}
            <button className="pill" onClick={() => setManage((v) => !v)} style={{ background: manage ? "var(--accent)" : "var(--section)", color: manage ? "var(--on-accent)" : "var(--fg2)" }}>
              <Icon name={manage ? "check" : "settings-2"} size={13} />{manage ? "Done managing" : "Manage"}
            </button>
          </div>
        </div>
      ) : view.name === "offer" ? (
        <div className="between" style={{ marginBottom: 18 }}>
          <button className="row" onClick={home} style={{ gap: 7, fontSize: 12, color: "var(--fg-muted)" }}><Icon name="arrow-left" size={14} />Knowledge Base</button>
          <button className="pill" onClick={() => setManage((v) => !v)} style={{ background: manage ? "var(--accent)" : "var(--section)", color: manage ? "var(--on-accent)" : "var(--fg2)" }}>
            <Icon name={manage ? "check" : "settings-2"} size={13} />{manage ? "Done managing" : "Manage"}
          </button>
        </div>
      ) : null}

      {view.name === "home" && (
        <KBHome onOpenOffer={openOffer} onOpenLesson={openLesson} onManage={() => setManage(true)} perRow={3} />
      )}
      {view.name === "offer" && (
        <KBOffer
          offerId={view.id}
          manage={manage}
          onOpenLesson={openLesson}
          onAddModule={(oid) => setModal({ kind: "module", offerId: oid })}
          onAddLesson={(oid, mid) => setModal({ kind: "lesson", offerId: oid, moduleId: mid })}
        />
      )}
      {view.name === "lesson" && (
        <KBLesson lessonId={view.id} onOpenLesson={openLesson} onBackOffer={openOffer} onBackHome={home} tick={tick} />
      )}

      {modal?.kind === "offer" && (
        <OfferModal onClose={() => setModal(null)} onSave={(data) => { const o = addOffer(data); setModal(null); openOffer(o.id); }} />
      )}
      {modal?.kind === "module" && (
        <ModuleModal onClose={() => setModal(null)} onSave={(title) => { addModule(modal.offerId, title); setModal(null); tick(); }} />
      )}
      {modal?.kind === "lesson" && (
        <LessonModal onClose={() => setModal(null)} onSave={(data) => { addLesson(modal.offerId, modal.moduleId, data); setModal(null); tick(); }} />
      )}
    </div>
  );
}
