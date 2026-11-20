import { useState } from 'react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  PauseCircle,
  Power,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OPERATION_MAP } from '../engine/registry';
import {
  OperationArgDefinition,
  OperationArgOption,
  RecipeStep,
  StepExecutionSnapshot,
} from '../types/engine';

interface RecipePipelineProps {
  recipe: RecipeStep[];
  snapshots: StepExecutionSnapshot[];
  inspectedStepId: string | null;
  onSelectInspectStep: (stepId: string | null) => void;
  onUpdateStepArgs: (stepId: string, argName: string, value: any) => void;
  onToggleStepEnabled: (stepId: string) => void;
  onToggleStepBreakpoint: (stepId: string) => void;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  onRemoveStep: (stepId: string) => void;
  onClearRecipe: () => void;
}

export function RecipePipeline({
  recipe,
  snapshots,
  inspectedStepId,
  onSelectInspectStep,
  onUpdateStepArgs,
  onToggleStepEnabled,
  onToggleStepBreakpoint,
  onMoveStep,
  onRemoveStep,
  onClearRecipe,
}: RecipePipelineProps) {
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});

  const toggleInlinePreview = (stepId: string) => {
    setExpandedPreviews((prev: Record<string, boolean>) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  return (
    <section className="w-[410px] bg-slate-900/60 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Recipe Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Recipe Pipeline ({recipe.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {inspectedStepId && (
            <button
              type="button"
              onClick={() => onSelectInspectStep(null)}
              className="px-2 py-1 rounded text-[11px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition"
            >
              Unpin Step View
            </button>
          )}
          {recipe.length > 0 && (
            <button
              type="button"
              onClick={onClearRecipe}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition"
              title="Clear all steps"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Step-by-Step Helper Banner */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click any step's Inspector icon to view or pin its intermediate output</span>
      </div>

      {/* Steps Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {recipe.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <Layers className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Your Recipe Pipeline is Empty</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Click any operation on the left sidebar or choose a Quick-Start Demo Recipe at the
              bottom-left to start transforming data.
            </p>
          </div>
        ) : (
          recipe.map((step: RecipeStep, index: number) => {
            const op = OPERATION_MAP.get(step.operationId);
            const snap = snapshots[index];
            const isPinned = inspectedStepId === step.id;
            const isPreviewOpen = Boolean(expandedPreviews[step.id]) || Boolean(snap?.error);

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition shadow-sm ${
                  snap?.error
                    ? 'border-rose-500/60 bg-rose-950/20'
                    : isPinned
                    ? 'border-cyan-400 bg-cyan-950/20 ring-1 ring-cyan-400/30'
                    : !step.enabled
                    ? 'border-slate-800/60 bg-slate-950/30 opacity-60'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                }`}
              >
                {/* Step Top Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {op?.name || step.operationId}
                    </span>
                  </div>

                  {/* Step Action Controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectInspectStep(isPinned ? null : step.id)}
                      className={`p-1 rounded text-xs transition ${
                        isPinned
                          ? 'bg-cyan-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                      }`}
                      title="Pin this step's intermediate output to the Output Workbench"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleInlinePreview(step.id)}
                      className={`p-1 rounded text-xs transition ${
                        isPreviewOpen
                          ? 'text-cyan-300 bg-cyan-500/15'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Toggle inline intermediate output preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStepBreakpoint(step.id)}
                      className={`p-1 rounded transition ${
                        step.breakpoint
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800'
                      }`}
                      title="Toggle breakpoint (pause pipeline after this step)"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStepEnabled(step.id)}
                      className={`p-1 rounded transition ${
                        step.enabled
                          ? 'text-emerald-400 hover:bg-slate-800'
                          : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                      title={step.enabled ? 'Disable step (bypass)' : 'Enable step'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveStep(index, -1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 hover:bg-slate-800"
                      title="Move step up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === recipe.length - 1}
                      onClick={() => onMoveStep(index, 1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 hover:bg-slate-800"
                      title="Move step down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveStep(step.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Remove step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step Arguments Form */}
                {op && op.args.length > 0 && (
                  <div className="p-3 space-y-2.5 bg-slate-900/40">
                    {op.args.map((arg: OperationArgDefinition) => {
                      const val = step.args[arg.name] ?? arg.defaultValue;
                      return (
                        <div key={arg.name} className="flex flex-col gap-1">
                          {arg.type === 'boolean' ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) =>
                                  onUpdateStepArgs(step.id, arg.name, e.target.checked)
                                }
                                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/40"
                              />
                              <span>{arg.label}</span>
                            </label>
                          ) : arg.type === 'select' ? (
                            <>
                              <label className="text-[11px] font-medium text-slate-400">
                                {arg.label}
                              </label>
                              <select
                                value={String(val)}
                                onChange={(e) =>
                                  onUpdateStepArgs(step.id, arg.name, e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                              >
                                {arg.options?.map((opt: OperationArgOption) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </>
                          ) : (
                            <>
                              <label className="text-[11px] font-medium text-slate-400">
                                {arg.label}
                              </label>
                              <input
                                type={arg.type === 'number' ? 'number' : 'text'}
                                value={String(val)}
                                placeholder={arg.placeholder}
                                onChange={(e) =>
                                  onUpdateStepArgs(
                                    step.id,
                                    arg.name,
                                    arg.type === 'number' ? Number(e.target.value) : e.target.value
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-cyan-500/60 focus:outline-none"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step Telemetry & Inline Intermediate Output Inspector */}
                {snap && (
                  <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/70 rounded-b-xl">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        {snap.error ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : !snap.enabled ? (
                          <span className="text-slate-500">Bypassed</span>
                        ) : snap.skippedByBreakpoint ? (
                          <span className="text-amber-400">Paused before step</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {snap.byteLength} B
                          </span>
                        )}

                        {step.breakpoint && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                            BREAKPOINT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 font-mono">
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {snap.durationMs}ms
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleInlinePreview(step.id)}
                          className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5 font-sans"
                        >
                          <span>{isPreviewOpen ? 'Hide' : 'Inspect'}</span>
                          {isPreviewOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isPreviewOpen && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80">
                        {snap.error ? (
                          <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-300 break-words">
                            {snap.error}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>Intermediate Output after Step #{index + 1}:</span>
                              <button
                                type="button"
                                onClick={() => onSelectInspectStep(isPinned ? null : step.id)}
                                className="text-cyan-400 hover:underline"
                              >
                                {isPinned ? 'Pinned to Main Output' : 'Open in Main Output ->'}
                              </button>
                            </div>
                            <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-200 max-h-28 overflow-auto whitespace-pre-wrap break-all">
                              {snap.outputSnapshot || '(empty output)'}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
