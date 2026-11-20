import { PipelineRunResult, RecipeStep, StepExecutionSnapshot } from '../types/engine';
import { OPERATION_MAP } from './registry';

export async function runRecipePipeline(
  initialInput: string,
  recipe: RecipeStep[]
): Promise<PipelineRunResult> {
  const startTotal = performance.now();
  const snapshots: StepExecutionSnapshot[] = [];
  let currentData = initialInput;
  let activeError: PipelineRunResult['activeError'];
  let stoppedAtBreakpoint: number | undefined;

  for (let i = 0; i < recipe.length; i++) {
    const step = recipe[i];
    const op = OPERATION_MAP.get(step.operationId);
    const opName = op?.name || step.operationId;
    const stepStart = performance.now();

    if (stoppedAtBreakpoint !== undefined || activeError) {
      snapshots.push({
        stepId: step.id,
        stepIndex: i,
        operationId: step.operationId,
        operationName: opName,
        enabled: step.enabled,
        skippedByBreakpoint: true,
        inputSnapshot: currentData,
        outputSnapshot: currentData,
        byteLength: new TextEncoder().encode(currentData).length,
        charLength: currentData.length,
        durationMs: 0,
      });
      continue;
    }

    if (!step.enabled || !op) {
      snapshots.push({
        stepId: step.id,
        stepIndex: i,
        operationId: step.operationId,
        operationName: opName,
        enabled: false,
        skippedByBreakpoint: false,
        inputSnapshot: currentData,
        outputSnapshot: currentData,
        byteLength: new TextEncoder().encode(currentData).length,
        charLength: currentData.length,
        durationMs: 0,
      });
      continue;
    }

    try {
      const nextOutput = await op.execute(currentData, step.args);
      const durationMs = Math.max(0.05, Number((performance.now() - stepStart).toFixed(2)));
      const byteLength = new TextEncoder().encode(nextOutput).length;

      snapshots.push({
        stepId: step.id,
        stepIndex: i,
        operationId: step.operationId,
        operationName: opName,
        enabled: true,
        skippedByBreakpoint: false,
        inputSnapshot: currentData,
        outputSnapshot: nextOutput,
        byteLength,
        charLength: nextOutput.length,
        durationMs,
      });

      currentData = nextOutput;

      if (step.breakpoint) {
        stoppedAtBreakpoint = i;
      }
    } catch (err: any) {
      const message = err?.message || 'Operation failed';
      const durationMs = Number((performance.now() - stepStart).toFixed(2));
      activeError = {
        stepIndex: i,
        operationName: opName,
        message,
      };
      snapshots.push({
        stepId: step.id,
        stepIndex: i,
        operationId: step.operationId,
        operationName: opName,
        enabled: true,
        skippedByBreakpoint: false,
        inputSnapshot: currentData,
        outputSnapshot: currentData,
        byteLength: new TextEncoder().encode(currentData).length,
        charLength: currentData.length,
        durationMs,
        error: message,
      });
    }
  }

  return {
    finalOutput: currentData,
    totalDurationMs: Number((performance.now() - startTotal).toFixed(2)),
    steps: snapshots,
    activeError,
    stoppedAtBreakpoint,
  };
}
