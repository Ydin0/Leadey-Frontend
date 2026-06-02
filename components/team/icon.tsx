"use client";

import {
  Phone, Mail, MessageSquare, Linkedin, BarChart3, Trophy, UsersRound,
  UserPlus, ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, CalendarCheck,
  Award, SlidersHorizontal, X, Minus, Plus, Check, Activity, Target,
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
