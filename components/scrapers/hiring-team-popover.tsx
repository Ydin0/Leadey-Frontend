"use client";

import { useState, useRef, useEffect } from "react";
import { Linkedin } from "lucide-react";

interface HiringTeamMember {
  name: string;
  role: string;
  linkedinUrl: string;
  imageUrl: string;
}

interface HiringTeamPopoverProps {
  team: HiringTeamMember[];
}

export function HiringTeamPopover({ team }: HiringTeamPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (team.length === 0) return <span className="text-[10px] text-ink-faint">--</span>;

  const displayTeam = team.slice(0, 3);
  const remaining = team.length - 3;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center -space-x-1.5"
      >
        {displayTeam.map((member, i) => (
          <MemberAvatar key={i} member={member} size={22} />
        ))}
        {remaining > 0 && (
          <span className="w-[22px] h-[22px] rounded-full bg-section border border-border-subtle flex items-center justify-center text-[9px] font-medium text-ink-muted z-10">
            +{remaining}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-60 bg-surface rounded-[10px] border border-border-subtle shadow-lg z-30 py-2">
          {team.map((member, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-1.5">
              <MemberAvatar member={member} size={24} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-ink truncate">{member.name}</div>
                <div className="text-[10px] text-ink-faint truncate">{member.role}</div>
              </div>
              {member.linkedinUrl && (
                <a
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-hover/50 text-ink-muted hover:text-signal-blue-text transition-colors flex-shrink-0"
                >
                  <Linkedin size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberAvatar({ member, size }: { member: HiringTeamMember; size: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (member.imageUrl && !imgError) {
    return (
      <img
        src={member.imageUrl}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full flex-shrink-0 border border-surface bg-section"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full flex-shrink-0 bg-section border border-surface flex items-center justify-center"
    >
      <span className="text-[8px] font-medium text-ink-muted">{initials}</span>
    </div>
  );
}
