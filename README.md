# FocusLock

FocusLock is an Android-prioritized, deadline-driven productivity and digital distraction management mobile app built with Expo, React Native, Expo Router, Zustand, and TypeScript.

This repository implements **Stage 1 (Frontend-First Architecture)**: local mock JSON seed datasets persisted to `AsyncStorage` behind typed repository interfaces so Firebase Auth/Firestore and native Android modules can replace mock services in Stage 2 without rewriting screen layouts.

## Core Capabilities (Stage 1)

- **Tasks & Deadlines:** Full CRUD, status/category filters, deadline/priority sorting, and overdue/due-soon visual indicators.
- **Background-Resilient Focus Timer:** Timestamp-based countdown (`endTimestampMs - Date.now()`) persisted via `AsyncStorage` with pause/resume, foreground recovery, and completion summary.
- **Simulated Android App Blocker:** Distracting Android app selector, simulated `Usage Access` and `Display Over Other Apps` permission cards (`Granted`, `Not Granted`, `Unavailable`), and a demo blocked-app interception modal wired through `src/services/native/blockerBridge.ts`.
- **Optional Camera Checkpoints:** Contextual `expo-camera` permission explainer, live preview frame, simulated object detection (pass & supportive non-shaming retry flows), and privacy-first metadata records (`imagePath: null`).
- **Analytics, Preferences & Demo Reset:** Local focus history, weekly/category breakdowns, theme switcher (`dark` / `light` / `system`), reminder previews, and one-tap **Reset Demo Data**.

## Architecture

```text
Screens (src/app/) -> Zustand Stores (src/store/) -> Repositories (src/repositories/) -> Local Storage / Mock Seeds (src/services/local/)
```

- `src/app/` — Expo Router screens (onboarding gate, mock auth, 4-tab layout, tasks CRUD/detail, and focus setup/active/checkpoint/completed flows).
- `src/components/` — Reusable UI primitives plus domain components (`ui`, `task`, `focus`, `blocker`, `checkpoint`).
- `src/repositories/` — Typed data boundaries (`TaskRepository`, `FocusRepository`, `SettingsRepository`, `AnalyticsRepository`).
- `src/services/` — Local persistence, simulated notification previews, native blocker bridge stub, and Stage 2 Firebase notes.

## Development Commands

```bash
npm install
npx expo start        # Start Expo dev server
npx expo lint         # Run ESLint
npx tsc --noEmit      # Run strict TypeScript check
npx expo-doctor       # Verify Expo SDK & dependency health
```

## Stage 2 Roadmap

- Replace mock repositories with Firebase Auth + user-scoped Cloud Firestore (`users/{uid}/...`).
- Implement the native Kotlin Android app blocker behind `BlockerBridge` (`UsageStatsManager` + overlay).
- Integrate on-device ML Kit object detection for camera checkpoints in a custom Expo development build.
