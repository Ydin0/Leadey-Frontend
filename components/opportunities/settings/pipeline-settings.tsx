"use client";

import { useCallback, useEffect, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  updateStage,
  createStage,
  deleteStage,
} from "@/lib/api/opportunities";
import type { Pipeline, PipelineStage, StageType } from "@/lib/types/opportunity";

const STAGE_TYPES: Array<{ value: StageType; label: string }> = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export function PipelineSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPipelines();
      setPipelines(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAddPipeline() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createPipeline({ name: newName.trim() });
      setNewName("");
      await reload();
    } catch (err: any) {
      setError(err?.message || "Failed to create pipeline");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeletePipeline(id: string) {
    try {
      await deletePipeline(id);
      await reload();
    } catch (err: any) {
      setError(err?.message || "Failed to delete pipeline");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-3 py-2 rounded-[8px] bg-signal-red/10 text-[11px] text-signal-red-text">
          {error}
        </div>
      )}

      <div className="card-brand bg-surface rounded-[14px] p-4">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Pipelines</h3>
        <p className="text-[11px] text-ink-muted mb-3">
          A pipeline groups stages for one motion (new business, renewals,
          partners). Each org gets a default Sales pipeline.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New pipeline name"
            className="flex-1 px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink outline-none focus:border-border-default placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={handleAddPipeline}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add
          </button>
        </div>
      </div>

      {pipelines.map((p) => (
        <PipelineCard
          key={p.id}
          pipeline={p}
          onReload={reload}
          onDelete={() => handleDeletePipeline(p.id)}
        />
      ))}
    </div>
  );
}

interface PipelineCardProps {
  pipeline: Pipeline;
  onReload: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function PipelineCard({ pipeline, onReload, onDelete }: PipelineCardProps) {
  const [stages, setStages] = useState<PipelineStage[]>(pipeline.stages);
  const [adding, setAdding] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState("");
  const [name, setName] = useState(pipeline.name);

  useEffect(() => {
    setStages(pipeline.stages);
  }, [pipeline.stages]);
  useEffect(() => {
    setName(pipeline.name);
  }, [pipeline.name]);

  // Rename works for EVERY pipeline, including the default one.
  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === pipeline.name) {
      setName(pipeline.name);
      return;
    }
    try {
      await updatePipeline(pipeline.id, { name: trimmed });
      onReload();
    } catch (err: any) {
      alert(err?.message || "Failed to rename pipeline");
      setName(pipeline.name);
    }
  }

  function patchLocal(stageId: string, patch: Partial<PipelineStage>) {
    setStages((cur) =>
      cur.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
    );
  }

  async function saveStage(stage: PipelineStage) {
    await updateStage(pipeline.id, stage.id, {
      label: stage.label,
      type: stage.type,
      defaultProbability: stage.defaultProbability,
      color: stage.color || undefined,
    });
  }

  async function handleAddStage() {
    if (!newStageLabel.trim()) return;
    setAdding(true);
    try {
      const created = await createStage(pipeline.id, {
        label: newStageLabel.trim(),
        type: "open",
        defaultProbability: 50,
      });
      setStages((cur) => [...cur, created]);
      setNewStageLabel("");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteStage(stageId: string) {
    try {
      await deleteStage(pipeline.id, stageId);
      setStages((cur) => cur.filter((s) => s.id !== stageId));
    } catch (err: any) {
      // Block error surfaces via the API message; parent doesn't have toast yet.
      alert(err?.message || "Failed to delete stage");
    }
  }

  return (
    <div className="card-brand bg-surface rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            title="Click to rename this pipeline"
            className="text-[13px] font-semibold text-ink bg-transparent outline-none border-b border-transparent hover:border-border-subtle focus:border-border-default rounded-none px-0 py-0.5 min-w-[140px]"
          />
          {pipeline.isDefault && (
            <span className="block text-[10px] uppercase tracking-wider text-ink-faint">Default</span>
          )}
        </div>
        {!pipeline.isDefault && (
          <button
            type="button"
            onClick={onDelete}
            className="text-ink-faint hover:text-signal-red-text p-1.5 rounded hover:bg-signal-red/10"
            title="Delete pipeline"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="rounded-[10px] border border-border-subtle overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_36px] gap-2 px-3 py-2 bg-section text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          <span>Label</span>
          <span>Type</span>
          <span>Probability</span>
          <span />
        </div>
        {stages.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-[1fr_120px_100px_36px] gap-2 px-3 py-2 border-t border-border-subtle items-center"
          >
            <input
              value={s.label}
              onChange={(e) => patchLocal(s.id, { label: e.target.value })}
              onBlur={() => saveStage(s)}
              className="text-[12px] text-ink bg-transparent outline-none border-b border-transparent focus:border-border-default"
            />
            <NativeSelect
              value={s.type}
              onChange={(e) => {
                const next = { ...s, type: e.target.value as StageType };
                patchLocal(s.id, { type: next.type });
                void saveStage(next);
              }}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none"
            >
              {STAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </NativeSelect>
            <input
              type="number"
              min={0}
              max={100}
              value={s.defaultProbability}
              onChange={(e) => patchLocal(s.id, { defaultProbability: Number(e.target.value) || 0 })}
              onBlur={() => saveStage(s)}
              className="text-[11px] text-ink bg-section rounded-[6px] px-2 py-1 outline-none text-center"
            />
            <button
              type="button"
              onClick={() => handleDeleteStage(s.id)}
              className="p-1 rounded text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input
          value={newStageLabel}
          onChange={(e) => setNewStageLabel(e.target.value)}
          placeholder="New stage label"
          className="flex-1 px-3 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[11px] text-ink outline-none focus:border-border-default"
        />
        <button
          type="button"
          onClick={handleAddStage}
          disabled={adding || !newStageLabel.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover disabled:opacity-40"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Stage
        </button>
      </div>
    </div>
  );
}
