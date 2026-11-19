import { SUPPORTED_CHECKPOINT_OBJECTS } from '@/constants/categories';

export type SimulatedCheckpointOutcome = 'auto' | 'pass' | 'fail';

export interface CheckpointDetectionAnalysis {
  detectedObjects: string[];
  verificationResult: 'passed' | 'failed';
  confidence: number;
  headline: string;
  guidance: string;
}

/**
 * Stage 1 Simulated On-Device Object Recognition.
 * Stage 2 can swap this function with a native ML Kit ImageLabeling / ObjectDetector call
 * while keeping the CheckpointRecord metadata shape identical (`imagePath: null`).
 */
export async function analyzeCheckpointScene(
  mode: SimulatedCheckpointOutcome = 'pass',
): Promise<CheckpointDetectionAnalysis> {
  // Brief realistic analysis delay
  await new Promise((resolve) => setTimeout(resolve, 650));

  const effectiveOutcome =
    mode === 'auto' ? (Math.random() >= 0.25 ? 'pass' : 'fail') : mode;

  if (effectiveOutcome === 'pass') {
    const matchedSets: { objects: string[]; confidence: number }[] = [
      { objects: ['laptop', 'book'], confidence: 0.86 },
      { objects: ['notebook', 'pen'], confidence: 0.82 },
      { objects: ['book', 'paper'], confidence: 0.79 },
    ];
    const picked = matchedSets[0];

    return {
      detectedObjects: picked.objects,
      verificationResult: 'passed',
      confidence: picked.confidence,
      headline: 'Work materials detected',
      guidance: `Recognized supported objects (${picked.objects.join(', ')}). Remember: checkpoints confirm desk materials are visible, not productivity itself.`,
    };
  }

  return {
    detectedObjects: [],
    verificationResult: 'failed',
    confidence: 0.24,
    headline: 'No supported work items spotted yet',
    guidance: `That’s okay — lighting or framing can hide items. Try placing a ${SUPPORTED_CHECKPOINT_OBJECTS.slice(0, 4).join(', ')} clearly inside the guide frame, or resume your focus block whenever ready.`,
  };
}
