"use client";

import {
  Phone, Mail, MessageSquare, Linkedin, BarChart3, Trophy, UsersRound,
  UserPlus, ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, CalendarCheck,
  Award, SlidersHorizontal, X, Minus, Plus, Check, Activity, Target,
  PlayCircle, FileText, PhoneCall, ListChecks, Paperclip, HelpCircle,
  ChevronRight, ChevronDown, FolderPlus, Settings2, Play, BookOpen, Clock,
  Layers, GraduationCap, Link, FilePlus2, AlertTriangle, ShieldAlert, Download,
  Pause, Gauge, Volume2, Maximize, Circle, RotateCcw, ArrowRight,
  Pencil, Trash2, ExternalLink, Loader2,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  phone: Phone,
  mail: Mail,
  "message-square": MessageSquare,
  linkedin: Linkedin,
  "bar-chart-3": BarChart3,
  trophy: Trophy,
  "users-round": UsersRound,
  "user-plus": UserPlus,
  "arrow-left": ArrowLeft,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "check-circle-2": CheckCircle2,
  "calendar-check": CalendarCheck,
  award: Award,
  "sliders-horizontal": SlidersHorizontal,
  x: X,
  minus: Minus,
  plus: Plus,
  check: Check,
  activity: Activity,
  target: Target,
  // Knowledge Base
  "play-circle": PlayCircle,
  "file-text": FileText,
  "phone-call": PhoneCall,
  "list-checks": ListChecks,
  paperclip: Paperclip,
  "help-circle": HelpCircle,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "folder-plus": FolderPlus,
  "settings-2": Settings2,
  play: Play,
  "book-open": BookOpen,
  clock: Clock,
  layers: Layers,
  "graduation-cap": GraduationCap,
  link: Link,
  "file-plus-2": FilePlus2,
  "alert-triangle": AlertTriangle,
  "shield-alert": ShieldAlert,
  download: Download,
  pause: Pause,
  gauge: Gauge,
  "volume-2": Volume2,
  maximize: Maximize,
  circle: Circle,
  "rotate-ccw": RotateCcw,
  "arrow-right": ArrowRight,
  pencil: Pencil,
  "trash-2": Trash2,
  "external-link": ExternalLink,
  loader: Loader2,
};

export function Icon({
  name, size = 16, strokeWidth = 1.75, style, className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const Cmp = MAP[name] ?? Activity;
  return <Cmp size={size} strokeWidth={strokeWidth} style={style} className={className} />;
}
