import React, { useMemo, useState } from 'react';
import {
  Search,
  Star,
  Plus,
  Server,
  Zap,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ALL_OPERATIONS, CATEGORIES, PRESET_RECIPES } from '../engine/registry';
import { OperationCategory, OperationDefinition, PresetRecipe } from '../types/engine';

interface SidebarProps {
  onAddOperation: (op: OperationDefinition) => void;
  onLoadPreset: (preset: PresetRecipe) => void;
  favorites: string[];
  onToggleFavorite: (opId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onAddOperation,
  onLoadPreset,
  favorites,
  onToggleFavorite,
}) => {
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Data Encodings': true,
    'Cryptography & Hashes': true,
    'Ciphers & Compression': true,
    'Code & Data Formats': true,
    'Text & Extractors': true,
  });

  const filteredOperations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_OPERATIONS.filter((op) => {
      if (showFavoritesOnly && !favorites.includes(op.id)) return false;
      if (!q) return true;
      return (
        op.name.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q)
      );
    });
  }, [search, showFavoritesOnly, favorites]);

  const toggleCategory = (cat: OperationCategory) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <aside className="w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Operations ({ALL_OPERATIONS.length})
          </span>
          <button
            onClick={() => setShowFavoritesOnly((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
              showFavoritesOnly
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Filter by starred operations"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Starred ({favorites.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Base64, AES, JWT, SHA..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Categorized Operations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {CATEGORIES.map((category) => {
          const ops = filteredOperations.filter((o) => o.category === category);
          if (ops.length === 0) return null;
          const isOpen = Boolean(search) || openCategories[category];

          return (
            <div key={category} className="rounded-lg border border-slate-800/80 bg-slate-950/40 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 text-left bg-slate-900/60 hover:bg-slate-800/70 transition"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-200 tracking-wide">
                    {category}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {ops.length}
                </span>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-800/50">
                  {ops.map((op) => {
                    const isFav = favorites.includes(op.id);
                    return (
                      <div
                        key={op.id}
                        className="group flex items-start justify-between p-2.5 hover:bg-slate-800/60 transition cursor-pointer"
                        onClick={() => onAddOperation(op)}
                      >
                        <div className="min-w-0 pr-2 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-slate-100 group-hover:text-cyan-300 transition">
                              {op.name}
                            </span>
                            {op.badge === 'Node.js' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Server className="w-2.5 h-2.5" />
                                Node
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                <Zap className="w-2.5 h-2.5" />
                                Fast
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {op.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(op.id);
                            }}
                            className={`p-1 rounded hover:bg-slate-700/60 transition ${
                              isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'
                            }`}
                            title={isFav ? 'Remove from starred' : 'Star operation'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                          <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredOperations.length === 0 && (
          <div className="text-center py-8 px-4 text-xs text-slate-500">
            No operations matching "{search}".
          </div>
        )}
      </div>

      {/* Preset Example Recipes Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick-Start Demo Recipes</span>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {PRESET_RECIPES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset)}
              className="w-full text-left px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 transition group"
            >
              <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                {preset.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
