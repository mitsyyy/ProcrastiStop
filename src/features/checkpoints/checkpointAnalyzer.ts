import {
  isNativeVisionAvailable,
  type LiveVisionFrameEvent,
  type MLKitImageLabel,
  runOnDeviceImageLabeling,
} from '@/services/native/focusVisionBridge';
import type { CheckpointTargetItem } from '@/types/task';

export interface CheckpointItemOption {
  key: CheckpointTargetItem;
  label: string;
  shortLabel: string;
  promptHint: string;
  synonyms: readonly string[];
}

export const CHECKPOINT_ITEM_OPTIONS: readonly CheckpointItemOption[] = [
  {
    key: 'book',
    label: 'Book / Textbook',
    shortLabel: 'Book',
    promptHint: 'Hover your camera over your book, textbook, or printed cover inside the guide box.',
    synonyms: [
      'book',
      'textbook',
      'notebook',
      'publication',
      'paper',
      'document',
      'novel',
      'binder',
      'magazine',
      'paperback',
      'hardcover',
      'reading',
      'literature',
      'page',
      'journal',
      'diary',
      'stationery',
      'manual',
      'booklet',
      'brochure',
      'flyer',
      'library',
      'comics',
      'paper product',
      'office supplies',
      'text',
      'print',
      'writing',
      'folder',
      'sheet',
    ],
  },
  {
    key: 'laptop',
    label: 'Laptop / Computer',
    shortLabel: 'Laptop',
    promptHint: 'Hover the camera over your laptop, desktop monitor, or computer screen.',
    synonyms: [
      'laptop',
      'computer',
      'personal computer',
      'netbook',
      'monitor',
      'screen',
      'display',
      'electronics',
      'computer keyboard',
      'keyboard',
      'gadget',
      'desktop',
      'office equipment',
      'computer hardware',
      'electronic device',
    ],
  },
  {
    key: 'notebook',
    label: 'Notebook / Paper',
    shortLabel: 'Notebook',
    promptHint: 'Hover over your notebook, study sheets, or written paper notes inside the guide box.',
    synonyms: [
      'notebook',
      'paper',
      'document',
      'diary',
      'journal',
      'writing',
      'handwriting',
      'text',
      'book',
      'textbook',
      'publication',
      'stationery',
      'office supplies',
      'sheet',
      'binder',
      'folder',
      'page',
      'paper product',
      'notepad',
      'pad',
      'sketchbook',
    ],
  },
  {
    key: 'pen',
    label: 'Pen / Pencil',
    shortLabel: 'Pen',
    promptHint: 'Hover directly over your pen, pencil, or writing tool inside the guide box.',
    synonyms: [
      'pen',
      'pencil',
      'ballpoint',
      'writing implement',
      'stationery',
      'marker',
      'highlighter',
      'office supplies',
      'ink',
      'handwriting',
      'stylus',
      'writing',
      'fountain pen',
      'calligraphy',
    ],
  },
  {
    key: 'keyboard',
    label: 'Keyboard',
    shortLabel: 'Keyboard',
    promptHint: 'Hover over your computer or laptop keyboard clearly inside the guide box.',
    synonyms: [
      'keyboard',
      'computer keyboard',
      'space bar',
      'laptop',
      'computer',
      'input device',
      'office equipment',
      'electronics',
      'typing',
      'computer hardware',
    ],
  },
  {
    key: 'workspace',
    label: 'Desk / Study Workspace',
    shortLabel: 'Workspace',
    promptHint: 'Hover over your study desk with your laptop, books, notebook, or office supplies.',
    synonyms: [
      'desk',
      'table',
      'office',
      'workspace',
      'study',
      'laptop',
      'computer',
      'book',
      'notebook',
      'paper',
      'keyboard',
      'monitor',
      'office supplies',
      'stationery',
      'pen',
      'chair',
      'furniture',
      'document',
    ],
  },
] as const;

export function getCheckpointItemOption(
  item?: CheckpointTargetItem | string | null,
): CheckpointItemOption {
  const normalized = typeof item === 'string' ? item.trim().toLowerCase() : '';
  return (
    CHECKPOINT_ITEM_OPTIONS.find((opt) => opt.key === normalized) ?? CHECKPOINT_ITEM_OPTIONS[0]
  );
}

export interface CheckpointDetectionAnalysis {
  detectedObjects: string[];
  rawLabels: MLKitImageLabel[];
  matchedObjects: string[];
  targetItem: CheckpointTargetItem;
  verificationResult: 'passed' | 'failed';
  confidence: number;
  headline: string;
  guidance: string;
  usedNativeVision: boolean;
}

export interface LiveFrameEvaluation {
  matched: boolean;
  confidence: number;
  matchedObjects: string[];
  topLabels: MLKitImageLabel[];
  ocrMatched: boolean;
  ocrSnippet: string;
  statusMessage: string;
}

const SCREEN_EXCLUDE_FOR_PAPER = [
  'mobile phone',
  'smartphone',
  'television',
  'computer monitor',
  'monitor',
];

function doesLabelMatchSynonyms(labelText: string, synonyms: readonly string[]): boolean {
  const normalized = labelText.trim().toLowerCase();
  if (!normalized) return false;
  return synonyms.some(
    (syn) => normalized === syn || normalized.includes(syn) || syn.includes(normalized),
  );
}

/**
 * Evaluates a single live center-ROI cropped CameraX + ML Kit frame (Image Labeling + OCR).
 * Used for hands-free hover verification (requiring 2 consecutive matching frames).
 */
export function evaluateLiveVisionFrame(
  frame: LiveVisionFrameEvent,
  targetItem: CheckpointTargetItem,
): LiveFrameEvaluation {
  const option = getCheckpointItemOption(targetItem);
  const labels = frame.labels ?? [];
  const topLabels = labels.slice(0, 4);

  // 1. Check direct ML Kit label whitelist against center-cropped ROI
  const matchedLabels = labels.filter(
    (lbl) => lbl.confidence >= 0.44 && doesLabelMatchSynonyms(lbl.text, option.synonyms),
  );

  if (matchedLabels.length > 0) {
    const best = matchedLabels[0];
    return {
      matched: true,
      confidence: best.confidence,
      matchedObjects: matchedLabels.slice(0, 3).map((m) => m.text),
      topLabels,
      ocrMatched: false,
      ocrSnippet: '',
      statusMessage: `Detected ${best.text} (${Math.round(best.confidence * 100)}%) — holding steady...`,
    };
  }

  // 2. Parallel ML Kit Text Recognition (OCR) confirmation for Book / Notebook covers & pages
  // Fixes patterned background/bedsheet bias (e.g. "Jeans/Denim/Textile") when printed cover text is visible.
  const isBookOrNotebook = option.key === 'book' || option.key === 'notebook';
  const cleanOcr = (frame.ocrText || '').replace(/\s+/g, ' ').trim();
  const hasVisibleText = frame.ocrCharCount >= 4 && frame.ocrWordCount >= 1 && cleanOcr.length >= 4;
  const clearlyAScreen = labels.some(
    (lbl) =>
      lbl.confidence >= 0.78 &&
      SCREEN_EXCLUDE_FOR_PAPER.some((ex) => lbl.text.trim().toLowerCase().includes(ex)),
  );

  if (isBookOrNotebook && hasVisibleText && !clearlyAScreen) {
    const snippet = cleanOcr.length > 26 ? `${cleanOcr.slice(0, 26)}…` : cleanOcr;
    const ocrConfidence = Math.min(0.95, 0.8 + Math.min(frame.ocrWordCount, 5) * 0.03);
    return {
      matched: true,
      confidence: ocrConfidence,
      matchedObjects: [option.shortLabel, `Cover text: "${snippet}"`],
      topLabels,
      ocrMatched: true,
      ocrSnippet: snippet,
      statusMessage: `Cover/page text detected ("${snippet}") — confirming ${option.shortLabel.toLowerCase()}...`,
    };
  }

  const topSummary = topLabels
    .slice(0, 3)
    .map((l) => `${l.text} (${Math.round(l.confidence * 100)}%)`)
    .join(', ');

  return {
    matched: false,
    confidence: topLabels[0]?.confidence ?? 0,
    matchedObjects: [],
    topLabels,
    ocrMatched: false,
    ocrSnippet: '',
    statusMessage: topSummary
      ? `Center box sees: ${topSummary}. Frame your ${option.shortLabel.toLowerCase()} inside the brackets.`
      : `Hover your ${option.shortLabel.toLowerCase()} inside the center guide brackets...`,
  };
}

/**
 * Fallback single-shot offline ML Kit check (kept for non-stream environments).
 */
export async function analyzeRealCheckpointImage(
  imageUri: string | null,
  targetItem: CheckpointTargetItem = 'book',
): Promise<CheckpointDetectionAnalysis> {
  const option = getCheckpointItemOption(targetItem);

  if (!imageUri) {
    return {
      detectedObjects: [],
      rawLabels: [],
      matchedObjects: [],
      targetItem: option.key,
      verificationResult: 'failed',
      confidence: 0,
      headline: 'Could not read camera frame',
      guidance: `Keep your ${option.shortLabel.toLowerCase()} centered inside the guide brackets.`,
      usedNativeVision: false,
    };
  }

  if (!isNativeVisionAvailable()) {
    return {
      detectedObjects: [],
      rawLabels: [],
      matchedObjects: [],
      targetItem: option.key,
      verificationResult: 'failed',
      confidence: 0,
      headline: 'Offline ML Kit requires the Android APK',
      guidance:
        'Real on-device Google ML Kit vision + OCR runs inside your built Android APK (not web/Expo Go).',
      usedNativeVision: false,
    };
  }

  try {
    const rawLabels = await runOnDeviceImageLabeling(imageUri);
    const matched = rawLabels.filter(
      (lbl) => lbl.confidence >= 0.44 && doesLabelMatchSynonyms(lbl.text, option.synonyms),
    );

    const topDisplayLabels = rawLabels
      .slice(0, 5)
      .map((l) => `${l.text} (${Math.round(l.confidence * 100)}%)`);

    if (matched.length > 0) {
      const best = matched[0];
      return {
        detectedObjects: matched.map((m) => m.text),
        rawLabels,
        matchedObjects: matched.map((m) => m.text),
        targetItem: option.key,
        verificationResult: 'passed',
        confidence: best.confidence,
        headline: `${option.shortLabel} verified!`,
        guidance: `Google ML Kit confirmed "${best.text}" (${Math.round(best.confidence * 100)}% confidence) offline.`,
        usedNativeVision: true,
      };
    }

    const topConfidence = rawLabels[0]?.confidence ?? 0;
    const seenSummary =
      topDisplayLabels.length > 0
        ? `ML Kit saw: ${topDisplayLabels.slice(0, 3).join(', ')}.`
        : 'No recognizable objects were clear enough in the guide box.';

    return {
      detectedObjects: rawLabels.slice(0, 4).map((l) => l.text),
      rawLabels,
      matchedObjects: [],
      targetItem: option.key,
      verificationResult: 'failed',
      confidence: topConfidence,
      headline: `${option.shortLabel} not detected`,
      guidance: `${seenSummary} Center your ${option.shortLabel.toLowerCase()} directly inside the guide box.`,
      usedNativeVision: true,
    };
  } catch (err) {
    return {
      detectedObjects: [],
      rawLabels: [],
      matchedObjects: [],
      targetItem: option.key,
      verificationResult: 'failed',
      confidence: 0,
      headline: 'Vision scan failed',
      guidance:
        err instanceof Error
          ? `${err.message}. Hold steady over your ${option.shortLabel.toLowerCase()}.`
          : `Hold steady over your ${option.shortLabel.toLowerCase()}.`,
      usedNativeVision: true,
    };
  }
}
