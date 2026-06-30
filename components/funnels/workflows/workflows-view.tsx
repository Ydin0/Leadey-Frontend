"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Plus, ChevronDown, Check, ZoomIn, ZoomOut, Maximize, Save, Play, Pause, Workflow as WorkflowIcon, Trash2, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,
} from "@/lib/api/workflows";
import type { Workflow, WorkflowGraph, WorkflowNode, WorkflowNodeType, WorkflowSettings, WorkflowStatus } from "@/lib/types/workflow";
import { NODE_TYPES, PALETTE_GROUPS, NODE_W, NODE_H } from "./node-types";
import { WorkflowCanvas, type CanvasView } from "./workflow-canvas";
import { WorkflowInspector } from "./workflow-inspector";
import { WorkflowActivity } from "./workflow-activity";
import { SlideOver } from "@/components/shared/slide-over";

function newId(p: string) { return p + Math.random().toString(36).slice(2, 8); }

export function WorkflowsView({ funnelId }: { funnelId: string }) {
  const isAuthReady = useAuthReady();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [graph, setGraph] = useState<WorkflowGraph>({ nodes: [], edges: [] });
  const [name, setName] = useState("");
  const [status, setStatus] = useState<WorkflowStatus>("draft");
  const [settings, setSettings] = useState<WorkflowSettings>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<CanvasView>({ x: 120, y: 30, scale: 0.85 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(560);

  const active = workflows?.find((w) => w.id === activeId) ?? null;

  // Size the builder to fill to just above the viewport bottom (keeps the
  // rounded card look with a little breathing room), measuring its real top.
  useEffect(() => {
    function measure() {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setBoxH(Math.max(480, window.innerHeight - top - 24));
    }
    measure();
    const raf = requestAnimationFrame(measure); // re-measure after layout settles
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
  }, [activeId, workflows]);

  // Load the campaign's workflows.
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    listWorkflows(funnelId)
      .then((list) => {
        if (cancelled) return;
        setWorkflows(list);
        if (list.length) selectWorkflow(list[0]);
      })
      .catch(() => { if (!cancelled) setWorkflows([]); });
    return () => { cancelled = true; };
  }, [isAuthReady, funnelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!switcherOpen) return;
    const onDown = (e: MouseEvent) => { if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [switcherOpen]);

  function selectWorkflow(w: Workflow) {
    setActiveId(w.id);
    setGraph(w.graph || { nodes: [], edges: [] });
    setName(w.name);
    setStatus(w.status);
    setSettings(w.settings || {});
    setSelectedId(null);
    setDirty(false);
  }

  const onGraphChange = useCallback((g: WorkflowGraph) => { setGraph(g); setDirty(true); }, []);

  function addNode(type: WorkflowNodeType) {
    const def = NODE_TYPES[type];
    // place below the selected node (or the lowest node), centered under it
    const anchor = (selectedId && graph.nodes.find((n) => n.id === selectedId)) ||
      [...graph.nodes].sort((a, b) => b.y - a.y)[0];
    const x = anchor ? anchor.x : 360;
    const y = anchor ? anchor.y + NODE_H + 70 : 60;
    const node: WorkflowNode = { id: newId("n"), type, x, y, data: def.defaultData() };
    const edges = [...graph.edges];
    // auto-connect from the anchor's first free single ("out") port
    if (anchor) {
      const aDef = NODE_TYPES[anchor.type];
      if (aDef.ports.length === 1 && !edges.some((e) => e.from === anchor.id && e.port === "out")) {
        edges.push({ id: newId("e"), from: anchor.id, port: "out", to: node.id });
      }
    }
    onGraphChange({ nodes: [...graph.nodes, node], edges });
    setSelectedId(node.id);
  }

  function onNodeData(id: string, patch: Record<string, unknown>) {
    onGraphChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) });
  }
  function onDeleteNode(id: string) {
    onGraphChange({ nodes: graph.nodes.filter((n) => n.id !== id), edges: graph.edges.filter((e) => e.from !== id && e.to !== id) });
    setSelectedId(null);
  }

  async function save() {
    if (!active || saving) return;
    setSaving(true);
    try {
      const updated = await updateWorkflow(funnelId, active.id, { name, status, graph, settings });
      setWorkflows((prev) => (prev ? prev.map((w) => (w.id === updated.id ? updated : w)) : [updated]));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!active) return;
    const next: WorkflowStatus = status === "active" ? "paused" : "active";
    setStatus(next);
    const updated = await updateWorkflow(funnelId, active.id, { status: next });
    setWorkflows((prev) => (prev ? prev.map((w) => (w.id === updated.id ? updated : w)) : [updated]));
  }

  async function create() {
    setBusy(true);
    try {
      const w = await createWorkflow(funnelId, `Workflow ${(workflows?.length ?? 0) + 1}`);
      setWorkflows((prev) => [...(prev ?? []), w]);
      selectWorkflow(w);
      setSwitcherOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function removeActive() {
    if (!active) return;
    if (!confirm(`Delete workflow “${active.name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteWorkflow(funnelId, active.id);
      const remaining = (workflows ?? []).filter((w) => w.id !== active.id);
      setWorkflows(remaining);
      if (remaining.length) selectWorkflow(remaining[0]);
      else { setActiveId(null); }
    } finally {
      setBusy(false);
    }
  }

  const selectedNode = useMemo(() => graph.nodes.find((n) => n.id === selectedId) ?? null, [graph.nodes, selectedId]);
  const liveStats = active?.stats ?? { enrolled: 0, active: 0, completed: 0 };

  // ── Loading / empty ──────────────────────────────────────────────────
  if (workflows === null) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }
  if (workflows.length === 0 || !active) {
    return (
      <div className="rounded-[16px] border border-border-subtle bg-surface p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-section flex items-center justify-center mx-auto mb-4"><WorkflowIcon size={20} className="text-ink-muted" /></div>
        <h3 className="text-[16px] font-semibold text-ink mb-1">No workflows yet</h3>
        <p className="text-[12px] text-ink-muted mb-5 max-w-md mx-auto">Build a branching automation — trigger, email/SMS/call, waits, conditions and goals — that runs for every lead in this campaign.</p>
        <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create a workflow
        </button>
      </div>
    );
  }

  const statusPill =
    status === "active" ? "bg-signal-green text-signal-green-text"
      : status === "paused" ? "bg-signal-slate text-signal-slate-text"
        : "bg-section text-ink-muted";

  return (
    <div ref={rootRef} className="flex rounded-[14px] border border-border-subtle bg-surface overflow-hidden" style={{ height: boxH }}>
      {/* PALETTE */}
      <div className="w-[210px] shrink-0 border-r border-border-subtle overflow-y-auto p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">Building blocks</div>
        <p className="text-[11px] text-ink-muted leading-snug mb-4">Click a block to add it{selectedNode ? " after the selected step" : ""}.</p>
        {PALETTE_GROUPS.map((g) => (
          <div key={g.name} className="mb-4">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink-faint mb-2">{g.name}</div>
            <div className="flex flex-col gap-1.5">
              {g.types.map((t) => {
                const def = NODE_TYPES[t]; const Icon = def.icon;
                return (
                  <button key={t} onClick={() => addNode(t)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border border-border-subtle bg-section/40 hover:bg-hover hover:border-border-default transition-colors text-left">
                    <span className="flex items-center justify-center w-6 h-6 rounded-[7px] bg-surface text-ink-secondary shrink-0"><Icon size={13} strokeWidth={1.75} /></span>
                    <span className="text-[12px] font-medium text-ink">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CANVAS COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* toolbar */}
        <div className="h-[52px] shrink-0 flex items-center gap-3 px-4 border-b border-border-subtle relative">
          <div ref={switcherRef} className="relative">
            <button onClick={() => setSwitcherOpen((o) => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-[9px] border border-border-subtle bg-section/50 hover:bg-hover">
              <span className="text-[13px] font-semibold text-ink">{name || "Workflow"}</span>
              <ChevronDown size={13} className="text-ink-muted" />
            </button>
            {switcherOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-[280px] z-50 bg-surface rounded-[12px] border border-border-subtle shadow-xl py-1.5">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink-faint px-3 py-1.5">Workflows in this campaign</div>
                {workflows.map((w) => (
                  <button key={w.id} onClick={() => { selectWorkflow(w); setSwitcherOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-hover text-left">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", w.status === "active" ? "bg-signal-green-text" : w.status === "paused" ? "bg-signal-slate-text" : "bg-ink-faint")} />
                    <span className="flex-1 min-w-0"><span className="block text-[12.5px] font-medium text-ink truncate">{w.name}</span><span className="block text-[10.5px] text-ink-muted capitalize">{w.status} · {w.stats.enrolled} enrolled</span></span>
                    {w.id === activeId && <Check size={14} className="text-accent" />}
                  </button>
                ))}
                <button onClick={create} className="flex items-center gap-2 w-full px-3 py-2 mt-1 border-t border-border-subtle text-accent text-[12.5px] font-semibold"><Plus size={14} /> New workflow</button>
              </div>
            )}
          </div>
          <span className={cn("text-[10px] font-semibold capitalize px-2.5 py-1 rounded-full", statusPill)}>{status}</span>
          <button onClick={() => setShowActivity(true)} title="View activity" className="flex items-center gap-3 text-[11.5px] text-ink-muted ml-1 px-2 py-1 rounded-[8px] hover:bg-hover transition-colors">
            <span><strong className="text-ink font-semibold">{liveStats.enrolled}</strong> enrolled</span>
            <span><strong className="text-ink font-semibold">{liveStats.active}</strong> in progress</span>
            <span><strong className="text-ink font-semibold">{liveStats.completed}</strong> completed</span>
            {(liveStats.failed ?? 0) > 0 && <span className="text-signal-red-text"><strong className="font-semibold">{liveStats.failed}</strong> failed</span>}
          </button>
          <button onClick={() => setShowActivity(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-section border border-border-subtle text-[12px] font-medium text-ink-secondary hover:bg-hover transition-colors">
            <ListChecks size={13} /> Activity
          </button>
          <div className="flex-1" />
          <div className="flex items-center bg-section border border-border-subtle rounded-[9px] overflow-hidden">
            <button onClick={() => setView((v) => ({ ...v, scale: Math.max(0.4, v.scale - 0.1) }))} className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink"><ZoomOut size={14} /></button>
            <span className="text-[11px] font-semibold text-ink-muted w-10 text-center">{Math.round(view.scale * 100)}%</span>
            <button onClick={() => setView((v) => ({ ...v, scale: Math.min(1.5, v.scale + 0.1) }))} className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink"><ZoomIn size={14} /></button>
            <button onClick={() => setView({ x: 120, y: 30, scale: 0.85 })} title="Reset view" className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink border-l border-border-subtle"><Maximize size={13} /></button>
          </div>
          <button onClick={() => void toggleStatus()} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold", status === "active" ? "bg-section text-ink-secondary hover:bg-hover" : "bg-signal-green text-signal-green-text")}>
            {status === "active" ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
          </button>
          <button onClick={() => void save()} disabled={saving || !dirty} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-ink text-on-ink text-[12px] font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {dirty ? "Save" : "Saved"}
          </button>
          <button onClick={() => void removeActive()} title="Delete workflow" className="w-8 h-8 rounded-[9px] flex items-center justify-center text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10"><Trash2 size={14} /></button>
        </div>

        <WorkflowCanvas graph={graph} onGraphChange={onGraphChange} selectedId={selectedId} onSelect={setSelectedId} view={view} onViewChange={setView} />
      </div>

      {/* INSPECTOR */}
      <div className="w-[300px] shrink-0 border-l border-border-subtle overflow-y-auto">
        <WorkflowInspector
          node={selectedNode}
          onNodeData={onNodeData}
          onDeleteNode={onDeleteNode}
          onDeselect={() => setSelectedId(null)}
          workflow={{ ...active, name, status, settings, graph }}
          onRename={(n) => { setName(n); setDirty(true); }}
          onStatus={(st) => { setStatus(st); setDirty(true); }}
          onSettings={(patch) => { setSettings((s) => ({ ...s, ...patch })); setDirty(true); }}
        />
      </div>

      <SlideOver open={showActivity} onClose={() => setShowActivity(false)} width="max-w-xl" panelClassName="bg-surface flex flex-col">
        <WorkflowActivity funnelId={funnelId} workflow={{ ...active, graph }} onClose={() => setShowActivity(false)} />
      </SlideOver>
    </div>
  );
}
