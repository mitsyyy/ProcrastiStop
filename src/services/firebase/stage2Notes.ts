/**
 * Stage 2 Firebase Integration Blueprint (Placeholder — No SDK dependency in Stage 1).
 *
 * When migrating from Mock Repositories to Firebase:
 * 1. Configure Firebase Auth + Cloud Firestore here.
 * 2. Replace MockTaskRepository, MockFocusRepository, MockSettingsRepository,
 *    and MockAnalyticsRepository implementations with Firestore-backed classes
 *    that implement the exact same TypeScript interfaces in `src/repositories/`.
 *
 * Planned User-Scoped Firestore Collections:
 * - users/{uid}                         -> Profile & UserPreferences
 * - users/{uid}/tasks/{taskId}          -> Task documents
 * - users/{uid}/focusSessions/{id}      -> FocusSession documents
 * - users/{uid}/appSettings/blocker     -> BlockedAppSettings document
 * - users/{uid}/checkpointRecords/{id}  -> CheckpointRecord metadata (imagePath: null)
 * - users/{uid}/analytics/{recordId}    -> Aggregated daily/weekly focus summaries
 */

export const STAGE_2_FIRESTORE_PATHS = {
  userDoc: (uid: string) => `users/${uid}`,
  tasks: (uid: string) => `users/${uid}/tasks`,
  focusSessions: (uid: string) => `users/${uid}/focusSessions`,
  appSettings: (uid: string) => `users/${uid}/appSettings`,
  checkpointRecords: (uid: string) => `users/${uid}/checkpointRecords`,
  analytics: (uid: string) => `users/${uid}/analytics`,
} as const;
