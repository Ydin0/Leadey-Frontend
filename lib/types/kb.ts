// Knowledge Base entity + content types. Mirrors the backend
// (leadey-backend/src/db/schema/knowledge-base.ts). The KB hub is built from
// these; lesson content is type-specific and resources/files are linked URLs.

export type LessonType = "video" | "article" | "script" | "quiz" | "file" | "faq";

export interface ArticleBlock { h: string; p: string }
export interface ScriptBody { hook: string; points: string[]; objections: { o: string; a: string }[] }
export interface QuizQuestion { q: string; options: string[]; answer: number }
/** A resource/file: either an uploaded file (carries `key`, served by the API)
 *  or an external linked URL. */
export interface LinkItem { name: string; url: string; type?: string; key?: string; size?: number }
export interface FaqItem { q: string; a: string }

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  dur: string;
  mins: number;
  summary: string;
  // video
  loom?: string;
  transcript?: string;
  resources?: LinkItem[];
  // article
  body?: ArticleBlock[];
  // script
  script?: ScriptBody;
  // quiz
  questions?: QuizQuestion[];
  // file
  files?: LinkItem[];
  // faq
  items?: FaqItem[];
  // attached by the API / on flatten:
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

export interface KbAssignment { offerId: string; userId: string }

export interface KnowledgeBaseData {
  canManage: boolean;
  offers: Offer[];
  assignments: KbAssignment[];
  progress: { done: Record<string, boolean> };
}

export const TYPES: Record<LessonType, { label: string; icon: string; color: string }> = {
  video: { label: "Video", icon: "play-circle", color: "#97A4D6" },
  article: { label: "Article", icon: "file-text", color: "#C8CFE6" },
  script: { label: "Script", icon: "phone-call", color: "#86EFAC" },
  quiz: { label: "Quiz", icon: "list-checks", color: "#E8C45C" },
  file: { label: "Resource", icon: "paperclip", color: "#6E7BCB" },
  faq: { label: "FAQ", icon: "help-circle", color: "#C8CFE6" },
};

export function fmtMins(mins: number): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function initials(s: string): string {
  return s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
