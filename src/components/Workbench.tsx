import React, { useMemo, useRef, useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Upload,
  ArrowUpLeft,
  FileCode2,
  Binary,
  GitCompare,
  Trash2,
  Pin,
} from 'lucide-react';
import { StepExecutionSnapshot } from '../types/engine';

interface WorkbenchProps {
  input: string;
  onChangeInput: (val: string) => void;
  finalOutput: string;
  inspectedStep: StepExecutionSnapshot | null;
  onClearInspectedStep: () => void;
  totalDurationMs: number;
  isRunning: boolean;
  activeError?: {
    stepIndex: number;
    operationName: string;
    message: string;
  };
}

type OutputViewMode = 'text' | 'hex' | 'diff';

function formatHexDump(str: string): string {
  const bytes = new TextEncoder().encode(str);
  if (bytes.length === 0) return '(0 bytes)';
  const lines: string[] = [];
  const maxBytes = Math.min(bytes.length, 4096);
  for (let offset = 0; offset < maxBytes; offset += 16) {
    const slice = bytes.subarray(offset, offset + 16);
    const hexPart = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(47, ' ');
    const asciiPart = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hexPart}  |${asciiPart}|`);
  }
  if (bytes.length > maxBytes) {
    lines.push(`... (${bytes.length - maxBytes} more bytes truncated in preview)`);
  }
  return lines.join('\n');
}

export const Workbench: React.FC<WorkbenchProps> = ({
  input,
  onChangeInput,
  finalOutput,
  inspectedStep,
  onClearInspectedStep,
  totalDurationMs,
  isRunning,
  activeError,
}) => {
  const [viewMode, setViewMode] = useState<OutputViewMode>('text');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayedOutput = inspectedStep ? inspectedStep.outputSnapshot : finalOutput;

  const inputStats = useMemo(() => {
    const bytes = new TextEncoder().encode(input).length;
    const lines = input ? input.split(/\r?\n/).length : 0;
    return { chars: input.length, bytes, lines };
  }, [input]);

  const outputStats = useMemo(() => {
    const bytes = new TextEncoder().encode(displayedOutput).length;
    const lines = displayedOutput ? displayedOutput.split(/\r?\n/).length : 0;
    return { chars: displayedOutput.length, bytes, lines };
  }, [displayedOutput]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([displayedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberchef-dave-output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChangeInput(String(reader.result ?? ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const diffLines = useMemo(() => {
    const inLines = input.split(/\r?\n/);
    const outLines = displayedOutput.split(/\r?\n/);
    const maxLen = Math.max(inLines.length, outLines.length);
    const rows: Array<{ line: number; left?: string; right?: string; changed: boolean }> = [];
    for (let i = 0; i < maxLen; i++) {
      const left = inLines[i];
      const right = outLines[i];
      rows.push({
        line: i + 1,
        left,
        right,
        changed: left !== right,
      });
    }
    return rows;
  }, [input, displayedOutput]);

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
      {/* Top Half: INPUT Panel */}
      <div className="flex-1 flex flex-col border-b border-slate-800 min-h-0">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Input Payload
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {inputStats.bytes.toLocaleString()} bytes · {inputStats.chars.toLocaleString()} chars ·{' '}
              {inputStats.lines} lines
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Load file into Input"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open File</span>
            </button>
            <button
              onClick={() => onChangeInput('')}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Clear Input"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          placeholder="Paste raw text, Base64, Hex, JWT, JSON, or logs here..."
          spellCheck={false}
          className="flex-1 w-full p-4 bg-slate-950 text-slate-100 font-mono text-sm leading-relaxed resize-none focus:outline-none"
        />
      </div>

      {/* Bottom Half: OUTPUT Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {inspectedStep
                ? `Pinned Step #${inspectedStep.stepIndex + 1}: ${inspectedStep.operationName}`
                : 'Baked Output'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {outputStats.bytes.toLocaleString()} bytes · {outputStats.chars.toLocaleString()} chars ·{' '}
              {totalDurationMs} ms
            </span>
            {isRunning && (
              <span className="text-xs text-cyan-300 animate-pulse font-mono">Running...</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {inspectedStep && (
              <button
                onClick={onClearInspectedStep}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition"
              >
                <Pin className="w-3 h-3" />
                <span>Back to Final Output</span>
              </button>
            )}

            {/* View Mode Switcher: Text | Hex | Diff */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 mr-2">
              <button
                onClick={() => setViewMode('text')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'text'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
              <button
                onClick={() => setViewMode('hex')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'hex'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Hex Dump</span>
              </button>
              <button
                onClick={() => setViewMode('diff')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'diff'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Diff</span>
              </button>
            </div>

            <button
              onClick={() => onChangeInput(displayedOutput)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Replace Input with current Output"
            >
              <ArrowUpLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Use as Input</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Download Output as file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error Banner if a step failed */}
        {activeError && (
          <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
            <span>
              <strong>Step #{activeError.stepIndex + 1} ({activeError.operationName}) Error:</strong>{' '}
              {activeError.message}
            </span>
          </div>
        )}

        {/* Output Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-950">
          {viewMode === 'text' && (
            <textarea
              readOnly
              value={displayedOutput}
              placeholder="Output will appear here automatically..."
              spellCheck={false}
              className="w-full h-full p-4 bg-slate-950 text-cyan-100 font-mono text-sm leading-relaxed resize-none focus:outline-none"
            />
          )}

          {viewMode === 'hex' && (
            <pre className="p-4 font-mono text-xs text-emerald-300 leading-relaxed select-all">
              {formatHexDump(displayedOutput)}
            </pre>
          )}

          {viewMode === 'diff' && (
            <div className="p-4 font-mono text-xs space-y-1">
              <div className="grid grid-cols-2 gap-4 pb-2 mb-2 border-b border-slate-800 text-slate-400 font-sans font-semibold">
                <div>Original Input</div>
                <div>Current Output</div>
              </div>
              {diffLines.map((row) => (
                <div
                  key={row.line}
                  className={`grid grid-cols-2 gap-4 px-2 py-0.5 rounded ${
                    row.changed ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <div className="text-rose-300/90 break-all whitespace-pre-wrap">
                    <span className="text-slate-600 select-none mr-2">{row.line}</span>
                    {row.left ?? ''}
                  </div>
                  <div className="text-emerald-300/90 break-all whitespace-pre-wrap">
                    <span className="text-slate-600 select-none mr-2">{row.line}</span>
                    {row.right ?? ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
