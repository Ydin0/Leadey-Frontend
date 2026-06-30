"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowGraph, WorkflowNode } from "@/lib/types/workflow";
import { NODE_TYPES, NODE_W, NODE_H, PORT_LABEL, nodeSummary } from "./node-types";

export interface CanvasView { x: number; y: number; scale: number }

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  onGraphChange: (g: WorkflowGraph) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  view: CanvasView;
  onViewChange: (v: CanvasView) => void;
  readOnly?: boolean;
}

type DragState =
  | { kind: "pan"; startX: number; startY: number; ox: number; oy: number }
  | { kind: "node"; id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean }
  | { kind: "connect"; from: string; port: string; cur: { x: number; y: number } }
  | null;

/** Port anchor points in stage coordinates. */
function inputPoint(n: WorkflowNode) {
  return { x: n.x + NODE_W / 2, y: n.y };
}
function outputPoint(n: WorkflowNode, portIndex: number, portCount: number) {
  const step = NODE_W / (portCount + 1);
  return { x: n.x + step * (portIndex + 1), y: n.y + NODE_H };
}
function edgePath(sx: number, sy: number, tx: number, ty: number) {
  const dy = Math.max(40, Math.abs(ty - sy) / 2);
  return `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
}

export function WorkflowCanvas({
  graph, onGraphChange, selectedId, onSelect, view, onViewChange, readOnly,
}: WorkflowCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const graphRef = useRef(graph);
  graphRef.current = graph;
  // force re-render while dragging a temp connector
  const tickRef = useRef(0);
  const [, setTick] = useState(0);

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  function toStage(clientX: number, clientY: number) {
    const r = wrapRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - (r?.left ?? 0) - v.x) / v.scale,
      y: (clientY - (r?.top ?? 0) - v.y) / v.scale,
    };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const v = viewRef.current;
      if (d.kind === "pan") {
        onViewChange({ ...v, x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) });
      } else if (d.kind === "node") {
        const dx = (e.clientX - d.startX) / v.scale;
        const dy = (e.clientY - d.startY) / v.scale;
        if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 3) d.moved = true;
        const g = graphRef.current;
        onGraphChange({
          ...g,
          nodes: g.nodes.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx, y: d.oy + dy } : n)),
        });
      } else if (d.kind === "connect") {
        d.cur = toStage(e.clientX, e.clientY);
        setTick((t) => (tickRef.current = t + 1));
      }
    }
    function onUp(e: PointerEvent) {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      if (d.kind === "node" && !d.moved) onSelect(d.id);
      if (d.kind === "connect") {
        // dropped onto a node? connect from→to with this port.
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-node-id]");
        const toId = el?.getAttribute("data-node-id");
        if (toId && toId !== d.from) {
          const g = graphRef.current;
          // one edge per (from, port); replace if exists
          const edges = g.edges.filter((ed) => !(ed.from === d.from && ed.port === d.port));
          edges.push({ id: `e${Math.random().toString(36).slice(2, 8)}`, from: d.from, port: d.port, to: toId });
          onGraphChange({ ...g, edges });
        }
        setTick((t) => (tickRef.current = t + 1));
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onGraphChange, onViewChange, onSelect]);

  // wheel zoom (clamped); pan with shift+wheel handled by browser
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return; // only zoom on ctrl/cmd-scroll; plain scroll pans
      e.preventDefault();
      const v = viewRef.current;
      const next = Math.min(1.5, Math.max(0.4, v.scale - e.deltaY * 0.0015));
      onViewChange({ ...v, scale: next });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onViewChange]);

  function startPan(e: React.PointerEvent) {
    if (readOnly) return;
    if ((e.target as HTMLElement).closest("[data-node-id]")) return; // node handles its own
    onSelect(null);
    dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y };
  }

  function startNodeDrag(e: React.PointerEvent, n: WorkflowNode) {
    if (readOnly) return;
    e.stopPropagation();
    dragRef.current = { kind: "node", id: n.id, startX: e.clientX, startY: e.clientY, ox: n.x, oy: n.y, moved: false };
  }

  function startConnect(e: React.PointerEvent, n: WorkflowNode, port: string, i: number, count: number) {
    if (readOnly) return;
    e.stopPropagation();
    const p = outputPoint(n, i, count);
    dragRef.current = { kind: "connect", from: n.id, port, cur: p };
    setTick((t) => (tickRef.current = t + 1));
  }

  function deleteNode(id: string) {
    const g = graphRef.current;
    onGraphChange({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    });
    if (selectedId === id) onSelect(null);
  }

  const drag = dragRef.current;

  return (
    <div
      ref={wrapRef}
      onPointerDown={startPan}
      className="relative flex-1 overflow-hidden bg-page cursor-grab"
      style={{ touchAction: "none" }}
    >
      {/* dotted grid + stage */}
      <div
        className="absolute origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, left: 0, top: 0 }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: -2000, top: -1500, width: 8000, height: 7000,
            backgroundImage: "radial-gradient(circle, rgba(127,140,180,0.18) 1.1px, transparent 1.1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* edges */}
        <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 8000, height: 7000 }}>
          {graph.edges.map((e) => {
            const from = nodeById.get(e.from);
            const to = nodeById.get(e.to);
            if (!from || !to) return null;
            const def = NODE_TYPES[from.type];
            const ports = def?.ports.length ? def.ports : ["out"];
            const pi = Math.max(0, ports.indexOf(e.port));
            const s = outputPoint(from, pi, ports.length);
            const t = inputPoint(to);
            return <path key={e.id} d={edgePath(s.x, s.y, t.x, t.y)} fill="none" stroke="var(--color-border-default)" strokeWidth={2} />;
          })}
          {drag?.kind === "connect" && (() => {
            const from = nodeById.get(drag.from);
            if (!from) return null;
            const def = NODE_TYPES[from.type];
            const ports = def?.ports.length ? def.ports : ["out"];
            const pi = Math.max(0, ports.indexOf(drag.port));
            const s = outputPoint(from, pi, ports.length);
            return <path d={edgePath(s.x, s.y, drag.cur.x, drag.cur.y)} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeDasharray="5 4" />;
          })()}
        </svg>

        {/* nodes */}
        {graph.nodes.map((n) => {
          const def = NODE_TYPES[n.type];
          if (!def) return null;
          const Icon = def.icon;
          const ports = def.ports;
          const selected = selectedId === n.id;
          return (
            <div
              key={n.id}
              data-node-id={n.id}
              onPointerDown={(e) => startNodeDrag(e, n)}
              className={cn(
                "absolute rounded-[12px] border bg-surface shadow-sm select-none",
                selected ? "border-accent ring-2 ring-accent/30" : "border-border-subtle",
              )}
              style={{ left: n.x, top: n.y, width: NODE_W, cursor: readOnly ? "default" : "grab" }}
            >
              {/* input dot */}
              {n.type !== "trigger" && (
                <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-surface border-2 border-border-default" />
              )}
              <div className="flex items-start gap-2.5 p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-section shrink-0" style={{ color: "var(--color-accent-strong, #4A5478)" }}>
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">{def.kicker}</div>
                  <div className="text-[12.5px] font-semibold text-ink truncate">{def.label}</div>
                  <div className="text-[11px] text-ink-muted truncate">{nodeSummary(n.type, n.data)}</div>
                </div>
                {!def.fixed && !readOnly && (
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); deleteNode(n.id); }}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {/* branch labels */}
              {ports.length > 1 && (
                <div className="flex items-center justify-around px-3 pb-2 -mt-1">
                  {ports.map((p) => (
                    <span key={p} className={cn(
                      "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                      p === "yes" || p === "a" ? "bg-signal-green/20 text-signal-green-text" : "bg-signal-red/15 text-signal-red-text",
                    )}>{PORT_LABEL[p] || p}</span>
                  ))}
                </div>
              )}
              {/* output ports */}
              {ports.map((p, i) => {
                const step = 100 / (ports.length + 1);
                return (
                  <div
                    key={p}
                    onPointerDown={(e) => startConnect(e, n, p, i, ports.length)}
                    title={ports.length > 1 ? `${PORT_LABEL[p] || p} branch` : "Drag to connect"}
                    className="absolute -bottom-1.5 w-3 h-3 rounded-full bg-accent border-2 border-surface cursor-crosshair hover:scale-125 transition-transform"
                    style={{ left: `calc(${step * (i + 1)}% - 6px)` }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {graph.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-ink-faint text-[14px]">
          Add a block from the left to begin.
        </div>
      )}
    </div>
  );
}
