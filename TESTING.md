# Testing Guide

## Smoke Tests

### 1. Initial Setup
- [ ] Run `bun install`
- [ ] Run `bun dev`
- [ ] Verify app loads at `http://localhost:3000`
- [ ] Verify redirection to `/login` if unauthenticated

### 2. Authentication
- [ ] Click "Sign in with Google"
- [ ] Verify popup opens
- [ ] Verify successful login redirects to Dashboard

### 3. Dashboard Operations
- [ ] Toggle "Edit Layout" mode (Pencil icon)
- [ ] **Add Frame**: Click "Add Widget" -> Select "Clock". Verify new frame appears.
- [ ] **Move Frame**: Drag a frame to a new position. Verify it snaps.
- [ ] **Resize Frame**: Drag the bottom-right corner. Verify content adapts.
- [ ] **Remove Frame**: Click the "X" on a frame. Verify it disappears.
- [ ] Click "Done" (Save icon). Verify layout persists (check console logs for "Saved layout").

### 4. Frame Functionality
- **Clock**: Verify time updates every minute.
- **Notes**: Type text. Reload page. Verify text persists (mock persistence).
- **Tasks**: Add a task "Test Task". Toggle completion. Delete task.
- **Photos**: Verify slideshow transitions.
- **Video**: Verify YouTube video loads.
- **Music**: Verify Spotify embed loads.

### 5. Google Integration
- [ ] Navigate to `/integrations/google/callback` (manually or via flow if implemented).
- [ ] Verify Cloud Function `exchangeGoogleCode` is called (check emulator logs).

## Automated Tests
Currently, the project focuses on end-to-end manual verification due to the visual nature of the dashboard.
Unit tests can be added using `bun test`.

## Troubleshooting
- **Firebase Error**: Ensure `firebase emulators:start` is running if testing local functions.
- **OAuth Error**: Ensure `NEXT_PUBLIC_FIREBASE_...` env vars are set in `.env.local`.
