export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Enter a valid email address.' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  return { valid: true };
}

export function validateTaskTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a task title.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Title must be at least 2 characters.' };
  }
  return { valid: true };
}

export function validateEstimatedMinutes(value: string): ValidationResult {
  if (!value.trim()) {
    return { valid: true }; // Optional field
  }
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0 || num > 600) {
    return { valid: false, error: 'Enter a whole number between 1 and 600 minutes.' };
  }
  return { valid: true };
}

export function validateFocusDuration(minutes: number): ValidationResult {
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
    return { valid: false, error: 'Focus duration must be between 1 and 240 minutes.' };
  }
  return { valid: true };
}

export interface TaskDeadlineValidationOptions {
  nowMs?: number;
  estimatedMinutes?: number | null;
  firstSessionDate?: Date | null;
}

export function validateTaskDeadline(
  deadlineIso: string | null,
  options?: TaskDeadlineValidationOptions,
): ValidationResult {
  if (!deadlineIso) {
    return { valid: false, error: 'Please select an actual deadline date and time.' };
  }
  const ts = new Date(deadlineIso).getTime();
  if (Number.isNaN(ts)) {
    return { valid: false, error: 'Select a valid deadline date and time.' };
  }

  const nowMs = options?.nowMs ?? Date.now();
  if (ts <= nowMs) {
    return {
      valid: false,
      error: 'Deadline cannot be in the past. Pick a future date and time.',
    };
  }

  const estMins = options?.estimatedMinutes;
  if (typeof estMins === 'number' && Number.isFinite(estMins) && estMins > 0) {
    const minFinishMs = nowMs + estMins * 60_000;
    if (ts < minFinishMs) {
      return {
        valid: false,
        error: `Deadline must leave at least ${estMins} min from now to finish this task.`,
      };
    }
  }

  const firstSession = options?.firstSessionDate;
  if (firstSession && !Number.isNaN(firstSession.getTime()) && ts < firstSession.getTime()) {
    const timeLabel = firstSession.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return {
      valid: false,
      error: `Deadline must be on or after your scheduled focus start (${timeLabel}).`,
    };
  }

  return { valid: true };
}

export function validateDailyReminderCount(count: number): ValidationResult {
  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 3) {
    return {
      valid: false,
      error: 'Choose at least 3 daily reminders to prevent last-minute cramming.',
    };
  }
  if (count > 8) {
    return { valid: false, error: 'You can schedule up to 8 daily reminders per task.' };
  }
  return { valid: true };
}
