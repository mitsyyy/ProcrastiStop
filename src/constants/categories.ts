export const TASK_CATEGORIES = [
  'Work',
  'Study',
  'Learning',
  'Research',
  'Personal',
  'Admin',
] as const;

export type TaskCategoryPreset = (typeof TASK_CATEGORIES)[number];

export const FOCUS_DURATION_PRESETS = [15, 25, 45, 60, 90] as const;

export const REMINDER_LEAD_OPTIONS = [5, 10, 15, 30] as const;
export const SHORT_BREAK_OPTIONS = [5, 10, 15] as const;
export const LONG_BREAK_OPTIONS = [15, 20, 30] as const;

export const SUPPORTED_CHECKPOINT_OBJECTS = [
  'book',
  'notebook',
  'laptop',
  'paper',
  'pen',
  'keyboard',
] as const;
