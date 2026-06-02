/**
 * Leadey — Knowledge Base data (ported from the design handoff).
 *
 * Agency model: each "Offer" is a client company/product reps sell for, with a
 * playbook of modules → lessons, plus a core "Company Onboarding" track.
 * Lesson progress persists to localStorage. Seeded content is in-memory.
 *
 * NOTE: content is seeded so the hub is usable immediately; persisting
 * authored offers/lessons/files to a backend is a follow-up. // TODO(backend)
 */

export type LessonType = "video" | "article" | "script" | "quiz" | "file" | "faq";

export interface ArticleBlock { h: string; p: string }
export interface ScriptBody { hook: string; points: string[]; objections: { o: string; a: string }[] }
export interface QuizQuestion { q: string; options: string[]; answer: number }
export interface FileItem { name: string; type: string; size: string }
export interface FaqItem { q: string; a: string }

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  dur: string;
  mins: number;
  summary: string;
  loom?: string;
  transcript?: string;
  resources?: string[];
  body?: ArticleBlock[];
  script?: ScriptBody;
  questions?: QuizQuestion[];
  files?: FileItem[];
  items?: FaqItem[];
  // attached on flatten:
  moduleId?: string;
  moduleTitle?: string;
  offerId?: string;
}

export interface KbModule { id: string; title: string; lessons: Lesson[] }
export interface Offer {
  id: string;
  name: string;
  tagline: string;
  category: string;
  accent: string;
  level: string;
  core?: boolean;
  about: string;
  modules: KbModule[];
}

export const TYPES: Record<LessonType, { label: string; icon: string; color: string }> = {
  video: { label: "Video", icon: "play-circle", color: "#97A4D6" },
  article: { label: "Article", icon: "file-text", color: "#C8CFE6" },
  script: { label: "Script", icon: "phone-call", color: "#86EFAC" },
  quiz: { label: "Quiz", icon: "list-checks", color: "#E8C45C" },
  file: { label: "Resource", icon: "paperclip", color: "#6E7BCB" },
  faq: { label: "FAQ", icon: "help-circle", color: "#C8CFE6" },
};

// Lesson builders keep the dataset readable.
const V = (id: string, title: string, dur: string, mins: number, summary: string, extra?: Partial<Lesson>): Lesson => ({
  id, title, type: "video", dur, mins, loom: "https://www.loom.com/share/" + id, summary,
  transcript: extra?.transcript || "In this walkthrough we cover the essentials step by step — follow along and pause whenever you need to.",
  resources: extra?.resources || [], ...extra,
});
const A = (id: string, title: string, dur: string, summary: string, body: ArticleBlock[] = []): Lesson => ({ id, title, type: "article", dur, mins: 5, summary, body });
const S = (id: string, title: string, dur: string, summary: string, script: ScriptBody): Lesson => ({ id, title, type: "script", dur, mins: 6, summary, script });
const Q = (id: string, title: string, summary: string, questions: QuizQuestion[]): Lesson => ({ id, title, type: "quiz", dur: questions.length + " questions", mins: 4, summary, questions });
const F = (id: string, title: string, summary: string, files: FileItem[]): Lesson => ({ id, title, type: "file", dur: files.length + " files", mins: 2, summary, files });
const FAQ = (id: string, title: string, summary: string, items: FaqItem[]): Lesson => ({ id, title, type: "faq", dur: items.length + " answers", mins: 3, summary, items });

export const OFFERS: Offer[] = [
  {
    id: "onboarding", name: "Company Onboarding", tagline: "Start here — how we work, the stack, and the signal-driven method.",
    category: "Onboarding", accent: "#97A4D6", level: "Required", core: true,
    about: "Every new rep completes this track in week one. It covers the Leadey method, the cockpit, and outreach fundamentals before you touch a client offer.",
    modules: [
      { id: "ob-m1", title: "Welcome & the method", lessons: [
        V("ob-l1", "Welcome to the team", "3:42", 4, "What we do, who we serve, and how reps win here.", { transcript: "Welcome aboard. We're a signal-driven outbound team — meaning we reach the right person at the right moment, not blast lists. Here's how your first 30 days will look…" }),
        V("ob-l2", "The signal-driven method", "8:10", 8, "Hiring, funding, tech-adoption & intent — why timing beats volume."),
        A("ob-l3", "Glossary: the words we use", "4 min read", "ICP, cadence, connect rate, ramp — the vocabulary you'll hear daily.", [
          { h: "ICP", p: "Ideal Customer Profile — the firmographic + signal definition of who an offer should target." },
          { h: "Cadence", p: "The multi-channel sequence of touches (call, email, LinkedIn, SMS) over a set window." },
          { h: "Connect rate", p: "% of dials that reach a live, qualified human. Our north-star activity metric." },
        ]),
      ]},
      { id: "ob-m2", title: "Tools of the trade", lessons: [
        V("ob-l4", "Cockpit tour", "11:25", 11, "Your daily command center: replies, calls, LinkedIn, email & signals."),
        V("ob-l5", "The Power Dialer", "6:55", 7, "Loading a call list, scripts, objection handlers, and logging outcomes."),
        F("ob-l6", "Setup checklist & links", "Everything to configure before day two.", [
          { name: "New rep setup checklist.pdf", type: "PDF", size: "240 KB" },
          { name: "Calendar & inbox connect.pdf", type: "PDF", size: "180 KB" },
        ]),
      ]},
      { id: "ob-m3", title: "Outreach fundamentals", lessons: [
        S("ob-l7", "The opening 15 seconds", "Script", "The permission-based opener that earns you the next 2 minutes.", {
          hook: "Hi {{first}}, this is {{rep}} from {{offer}}. I know I'm an interruption — can I take 20 seconds to tell you why I called, and you can decide if it's worth continuing?",
          points: ["Lead with the signal that triggered the call", "Name the outcome, not the feature", "Always ask permission to continue"],
          objections: [{ o: "\"I'm not interested.\"", a: "Totally fair — most people aren't until they hear the one thing that's different. Can I share it in one sentence?" }, { o: "\"Send me an email.\"", a: "Happy to. So I send the right thing — are you more focused on X or Y right now?" }],
        }),
        Q("ob-l8", "Method knowledge check", "Prove you've got the fundamentals before moving on.", [
          { q: "What makes outreach 'signal-driven'?", options: ["Higher send volume", "Reaching prospects at a trigger moment", "Using more channels"], answer: 1 },
          { q: "Which is our north-star activity metric?", options: ["Emails sent", "Connect rate", "LinkedIn views"], answer: 1 },
          { q: "When do you ask permission in the opener?", options: ["Never", "After the pitch", "In the first 15 seconds"], answer: 2 },
        ]),
      ]},
    ],
  },
  {
    id: "nimbus", name: "Nimbus CRM", tagline: "Mid-market CRM for revenue teams that hate data entry.",
    category: "SaaS", accent: "#6E7BCB", level: "Core offer",
    about: "Nimbus is an AI-native CRM. Reps sell into RevOps and sales leaders at 50–500 person companies. Average deal $24k ARR.",
    modules: [
      { id: "nb-m1", title: "Know the product", lessons: [
        V("nb-l1", "Nimbus in 5 minutes", "5:18", 5, "The product story, the wedge, and who loves it most."),
        A("nb-l2", "Pricing & packaging", "6 min read", "Seats, tiers, and where the discount levers are.", [
          { h: "Tiers", p: "Starter, Growth, and Enterprise. Most reps sell Growth at $24k ARR." },
          { h: "Levers", p: "Annual prepay (10%), multi-year (15%), and design-partner logos." },
        ]),
        FAQ("nb-l3", "Objection FAQ", "The five objections you'll hear every week, answered.", [
          { q: "\"We already use Salesforce.\"", a: "Nimbus layers on top or replaces — most teams cut admin time 60%. Worth a 20-min teardown?" },
          { q: "\"Too expensive.\"", a: "Compared to a half-time ops hire it pays back in a quarter. Want the ROI math?" },
        ]),
      ]},
      { id: "nb-m2", title: "Run the play", lessons: [
        S("nb-l4", "Cold call script — RevOps", "Script", "Opener + discovery for a RevOps leader.", {
          hook: "Hi {{first}}, {{rep}} with Nimbus. Saw {{company}} just added 8 AEs — usually that's when CRM hygiene falls apart. That the case for you?",
          points: ["Anchor on the hiring signal", "Quantify admin time lost", "Offer a teardown, not a demo"],
          objections: [{ o: "\"Now's not a good time.\"", a: "Understood — when teams scale fast it never is. That's exactly the moment most regret waiting. 15 minutes Thursday?" }],
        }),
        V("nb-l5", "Live demo walkthrough", "14:02", 14, "How to run the 12-minute demo that converts."),
        Q("nb-l6", "Nimbus certification", "Pass to be cleared to dial this offer.", [
          { q: "Nimbus' core wedge is…", options: ["Cheapest price", "Killing manual data entry", "Most integrations"], answer: 1 },
          { q: "Typical Growth deal size?", options: ["$24k ARR", "$4k ARR", "$120k ARR"], answer: 0 },
        ]),
      ]},
    ],
  },
  {
    id: "peak", name: "PeakCoaching", tagline: "High-ticket coaching for founders scaling past $1M.",
    category: "Coaching", accent: "#86EFAC", level: "Core offer",
    about: "A $12k–$30k coaching program. Reps run a two-call close (qualify → close). Emotional, outcome-led selling.",
    modules: [
      { id: "pk-m1", title: "The offer", lessons: [
        V("pk-l1", "What PeakCoaching actually is", "7:30", 8, "Program, promise, and the transformation we sell."),
        A("pk-l2", "Who qualifies (and who doesn't)", "5 min read", "Tight qualification protects close rate and refunds.", [
          { h: "Green flags", p: "Existing revenue, coachable, decision-maker, urgency." },
          { h: "Red flags", p: "Looking for a silver bullet, can't invest, not the decision-maker." },
        ]),
      ]},
      { id: "pk-m2", title: "The two-call close", lessons: [
        S("pk-l3", "Discovery call framework", "Script", "Surface the gap, the cost of inaction, and the desired future.", {
          hook: "Before I tell you anything about the program — walk me through where the business is now versus where you wanted it to be by now.",
          points: ["Spend 80% listening", "Quantify the cost of staying stuck", "Only invite to call two if they qualify"],
          objections: [{ o: "\"I need to think about it.\"", a: "Of course. What specifically do you need to think through — the investment, the time, or whether it'll work for you?" }],
        }),
        V("pk-l4", "Handling price on the close call", "9:48", 10, "Framing $20k as the cost of NOT solving the problem."),
      ]},
    ],
  },
  {
    id: "vaultpay", name: "Vaultpay", tagline: "Embedded payments & payouts for marketplaces.",
    category: "Fintech", accent: "#C8CFE6", level: "New",
    about: "Vaultpay is an embedded-finance API. Reps sell to product & finance leaders at marketplaces. Longer, technical cycle.",
    modules: [
      { id: "vp-m1", title: "Foundations", lessons: [
        V("vp-l1", "Embedded finance 101", "10:15", 10, "The category, the buyers, and why now."),
        F("vp-l2", "One-pager & security deck", "Leave-behinds for technical buyers.", [
          { name: "Vaultpay one-pager.pdf", type: "PDF", size: "1.2 MB" },
          { name: "SOC2 & security overview.pdf", type: "PDF", size: "3.4 MB" },
        ]),
      ]},
    ],
  },
];

export const OFFER_MAP: Record<string, Offer> = Object.fromEntries(OFFERS.map((o) => [o.id, o]));

export function lessonsOf(offer: Offer): Lesson[] {
  return offer.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title, offerId: offer.id })));
}
export function allLessons(): Lesson[] {
  return OFFERS.flatMap(lessonsOf);
}
export function lessonById(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

export function offerStats(offer: Offer) {
  const ls = lessonsOf(offer);
  return { lessons: ls.length, mins: ls.reduce((a, l) => a + (l.mins || 0), 0), modules: offer.modules.length };
}

export const PATH = ["ob-l1", "ob-l2", "ob-l4", "ob-l7", "ob-l8", "nb-l1", "pk-l1"];

// ── progress (localStorage, SSR-safe) ────────────────────────────────────
const KEY = "leadey_kb_v1";
let state: { done: Record<string, boolean>; last: string } = { done: {}, last: "ob-l1" };
let hydrated = false;
function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const progress = {
  /** Load persisted progress — call once on mount (avoids SSR mismatch). */
  hydrate() {
    if (hydrated || typeof window === "undefined") return;
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) state = { done: s.done || {}, last: s.last || "ob-l1" };
    } catch { /* ignore */ }
    hydrated = true;
  },
  isDone: (id: string) => !!state.done[id],
  setDone: (id: string, v: boolean) => { if (v) state.done[id] = true; else delete state.done[id]; persist(); },
  toggle: (id: string) => { progress.setDone(id, !state.done[id]); return !!state.done[id]; },
  last: () => state.last,
  setLast: (id: string) => { state.last = id; persist(); },
  countDone: (ids: string[]) => ids.filter((id) => state.done[id]).length,
  reset: () => { state = { done: {}, last: "ob-l1" }; persist(); },
};

export function offerProgress(offer: Offer) {
  const ids = lessonsOf(offer).map((l) => l.id);
  const done = progress.countDone(ids);
  return { done, total: ids.length, pct: ids.length ? done / ids.length : 0 };
}
export function nextLesson(offerId: string, lessonId: string): Lesson | null {
  const ls = lessonsOf(OFFER_MAP[offerId]);
  const i = ls.findIndex((l) => l.id === lessonId);
  return i >= 0 && i < ls.length - 1 ? ls[i + 1] : null;
}
export function prevLesson(offerId: string, lessonId: string): Lesson | null {
  const ls = lessonsOf(OFFER_MAP[offerId]);
  const i = ls.findIndex((l) => l.id === lessonId);
  return i > 0 ? ls[i - 1] : null;
}

// ── authoring (in-session) ───────────────────────────────────────────────
let _seq = 1000;
const nid = (p: string) => p + "-" + (++_seq);

export function addOffer(data: { name: string; tagline: string; category: string; level: string; accent: string }): Offer {
  const o: Offer = {
    id: nid("of"), level: data.level || "New", accent: data.accent || "#97A4D6",
    about: data.tagline || "", name: data.name, tagline: data.tagline, category: data.category,
    modules: [{ id: nid("m"), title: "Getting started", lessons: [] }],
  };
  OFFERS.push(o);
  OFFER_MAP[o.id] = o;
  return o;
}
export function addModule(offerId: string, title: string): KbModule {
  const m: KbModule = { id: nid("m"), title: title || "New module", lessons: [] };
  OFFER_MAP[offerId].modules.push(m);
  return m;
}
export function addLesson(offerId: string, moduleId: string, data: { title: string; type: LessonType; loom?: string; dur?: string; summary?: string }): Lesson {
  const mod = OFFER_MAP[offerId].modules.find((m) => m.id === moduleId)!;
  const l: Lesson = {
    id: nid("l"), title: data.title, type: data.type,
    dur: data.dur || (data.type === "video" ? "0:00" : TYPES[data.type].label),
    mins: data.type === "video" ? 6 : 4, summary: data.summary || "",
    ...(data.type === "video" && data.loom ? { loom: data.loom } : {}),
    ...(data.type === "video" ? { transcript: "Transcript will appear here once the video is processed." } : {}),
  };
  mod.lessons.push(l);
  return l;
}

export function initials(s: string): string {
  return s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
