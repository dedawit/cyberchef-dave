import { useCallback, useEffect, useState } from 'react';
import { Shield, Play, Zap, Server, Sun, Moon } from 'lucide-react';
import { OPERATION_MAP, PRESET_RECIPES } from './engine/registry';
import { runRecipePipeline } from './engine/runner';
import {
  OperationArgDefinition,
  OperationDefinition,
  PipelineRunResult,
  PresetRecipe,
  RecipeStep,
  StepExecutionSnapshot,
} from './types/engine';
import { Sidebar } from './components/Sidebar';
import { RecipePipeline } from './components/RecipePipeline';
import { Workbench } from './components/Workbench';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('cyberchef_dave_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('cyberchef_dave_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const [input, setInput] = useState<string>('');
  const [recipe, setRecipe] = useState<RecipeStep[]>(() => [
    {
      id: `step-0-${Date.now()}`,
      operationId: 'from_base64',
      enabled: true,
      args: {},
    },
  ]);

  const [autoBake, setAutoBake] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cyberchef_dave_favorites');
      return saved
        ? JSON.parse(saved)
        : ['to_base64', 'from_base64', 'jwt_decode', 'crypto_hash', 'aes_encrypt'];
    } catch {
      return ['to_base64', 'from_base64', 'jwt_decode', 'crypto_hash'];
    }
  });

  const [runResult, setRunResult] = useState<PipelineRunResult>({
    finalOutput: '',
    totalDurationMs: 0,
    steps: [],
  });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [inspectedStepId, setInspectedStepId] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<{ online: boolean; version?: string }>({
    online: false,
  });

  useEffect(() => {
    const checkBackend = async () => {
      for (const base of ['', 'http://127.0.0.1:3001']) {
        try {
          const r = await fetch(`${base}/api/health`);
          if (r.ok) {
            const data = await r.json();
            if (data?.status === 'ok') {
              setNodeStatus({ online: true, version: data.nodeVersion });
              return;
            }
          }
        } catch {
          // try fallback
        }
      }
      setNodeStatus({ online: false });
    };
    checkBackend();
  }, []);

  const executeBake = useCallback(async (currentInput: string, currentRecipe: RecipeStep[]) => {
    setIsRunning(true);
    try {
      const res = await runRecipePipeline(currentInput, currentRecipe);
      setRunResult(res);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!autoBake) return;
    const timer = setTimeout(() => {
      executeBake(input, recipe);
    }, 60);
    return () => clearTimeout(timer);
  }, [input, recipe, autoBake, executeBake]);

  const handleToggleFavorite = (opId: string) => {
    setFavorites((prev: string[]) => {
      const next = prev.includes(opId)
        ? prev.filter((id: string) => id !== opId)
        : [...prev, opId];
      try {
        localStorage.setItem('cyberchef_dave_favorites', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleAddOperation = (op: OperationDefinition) => {
    const defaultArgs: Record<string, any> = {};
    op.args.forEach((a: OperationArgDefinition) => {
      defaultArgs[a.name] = a.defaultValue;
    });
    const newStep: RecipeStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operationId: op.id,
      enabled: true,
      args: defaultArgs,
    };
    setRecipe((prev: RecipeStep[]) => [...prev, newStep]);
  };

  const handleLoadPreset = (preset: PresetRecipe) => {
    setInspectedStepId(null);
    setInput(preset.sampleInput);
    setRecipe(
      preset.steps.map((s, idx) => {
        const def = OPERATION_MAP.get(s.operationId);
        const defaultArgs: Record<string, any> = {};
        def?.args.forEach((a: OperationArgDefinition) => {
          defaultArgs[a.name] = a.defaultValue;
        });
        return {
          id: `step-${idx}-${Date.now()}`,
          operationId: s.operationId,
          enabled: true,
          args: { ...defaultArgs, ...(s.args || {}) },
        };
      })
    );
  };

  const handleUpdateStepArgs = (stepId: string, argName: string, value: any) => {
    setRecipe((prev: RecipeStep[]) =>
      prev.map((s: RecipeStep) =>
        s.id === stepId ? { ...s, args: { ...s.args, [argName]: value } } : s
      )
    );
  };

  const handleToggleStepEnabled = (stepId: string) => {
    setRecipe((prev: RecipeStep[]) =>
      prev.map((s: RecipeStep) => (s.id === stepId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleToggleStepBreakpoint = (stepId: string) => {
    setRecipe((prev: RecipeStep[]) =>
      prev.map((s: RecipeStep) =>
        s.id === stepId ? { ...s, breakpoint: !s.breakpoint } : s
      )
    );
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    setRecipe((prev: RecipeStep[]) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (inspectedStepId === stepId) {
      setInspectedStepId(null);
    }
    setRecipe((prev: RecipeStep[]) => prev.filter((s: RecipeStep) => s.id !== stepId));
  };

  const inspectedSnapshot =
    runResult.steps.find((s: StepExecutionSnapshot) => s.stepId === inspectedStepId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Studio Navigation Bar */}
      <header className="h-13 px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">CyberChef-Dave</h1>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Phase 1 Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hybrid Client + Node.js Cyber Transformation & Step-by-Step Pipeline Inspector
            </p>
          </div>
        </div>

        {/* Right Controls: Node Engine Status + Theme Toggle + Auto-Bake + Manual Bake */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
              nodeStatus.online
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>
              {nodeStatus.online
                ? `Node.js Engine (${nodeStatus.version})`
                : 'Client-Only Mode'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs text-slate-200 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-xs text-slate-200">
            <input
              type="checkbox"
              checked={autoBake}
              onChange={(e) => setAutoBake(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Bake</span>
          </label>

          <button
            type="button"
            onClick={() => executeBake(input, recipe)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-sm shadow-cyan-500/20 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Bake Now</span>
          </button>
        </div>
      </header>

      {/* Main 3-Pane Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          onAddOperation={handleAddOperation}
          onLoadPreset={handleLoadPreset}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />

        <RecipePipeline
          recipe={recipe}
          snapshots={runResult.steps}
          inspectedStepId={inspectedStepId}
          onSelectInspectStep={setInspectedStepId}
          onUpdateStepArgs={handleUpdateStepArgs}
          onToggleStepEnabled={handleToggleStepEnabled}
          onToggleStepBreakpoint={handleToggleStepBreakpoint}
          onMoveStep={handleMoveStep}
          onRemoveStep={handleRemoveStep}
          onClearRecipe={() => {
            setInspectedStepId(null);
            setRecipe([]);
          }}
        />

        <Workbench
          input={input}
          onChangeInput={setInput}
          finalOutput={runResult.finalOutput}
          inspectedStep={inspectedSnapshot}
          onClearInspectedStep={() => setInspectedStepId(null)}
          totalDurationMs={runResult.totalDurationMs}
          isRunning={isRunning}
          activeError={runResult.activeError}
        />
      </div>
    </div>
  );
}

export default App;
