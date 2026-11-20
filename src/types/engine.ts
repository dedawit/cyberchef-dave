export type OperationCategory =
  | 'Data Encodings'
  | 'Cryptography & Hashes'
  | 'Ciphers & Compression'
  | 'Code & Data Formats'
  | 'Text & Extractors';

export interface OperationArgOption {
  label: string;
  value: string;
}

export interface OperationArgDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  defaultValue: string | number | boolean;
  placeholder?: string;
  options?: OperationArgOption[];
}

export interface OperationDefinition {
  id: string;
  name: string;
  category: OperationCategory;
  description: string;
  badge?: 'Client' | 'Node.js';
  args: OperationArgDefinition[];
  execute: (input: string, args: Record<string, any>) => Promise<string> | string;
}

export interface RecipeStep {
  id: string;
  operationId: string;
  enabled: boolean;
  breakpoint?: boolean;
  args: Record<string, any>;
}

export interface StepExecutionSnapshot {
  stepId: string;
  stepIndex: number;
  operationId: string;
  operationName: string;
  enabled: boolean;
  skippedByBreakpoint: boolean;
  inputSnapshot: string;
  outputSnapshot: string;
  byteLength: number;
  charLength: number;
  durationMs: number;
  error?: string;
}

export interface PipelineRunResult {
  finalOutput: string;
  totalDurationMs: number;
  steps: StepExecutionSnapshot[];
  activeError?: {
    stepIndex: number;
    operationName: string;
    message: string;
  };
  stoppedAtBreakpoint?: number;
}

export interface PresetRecipe {
  id: string;
  name: string;
  description: string;
  sampleInput: string;
  steps: Array<{
    operationId: string;
    args?: Record<string, any>;
  }>;
}
