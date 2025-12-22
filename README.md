# PersonalPod

Your personal command center—a production-quality dashboard for Raspberry Pi / Wall Displays, built with Next.js, Firebase, and Bun.

**Website:** [PersonalPod.space](https://personalpod.space)

## Features
- **Draggable/Resizable Grid**: Customize your layout exactly how you want it.
- **Widgets (Frames)**:
  - 📅 **Google Calendar**: Agenda view.
  - 🖼️ **Google Photos**: Slideshow.
  - 📝 **Notes**: Sticky notes.
  - ✅ **Tasks**: Simple todo list.
  - 🎵 **Music**: Spotify embed.
  - 📺 **Video**: YouTube embed.
  - 🌐 **Web**: Iframe embed for weather, news, etc.
  - ⏰ **Clock**: Big digital clock.
- **Auth**: Secure owner-only access via Firebase Auth.
- **Responsive**: Works on 1080p screens, tablets, and mobile.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions v2).
- **Runtime**: Bun.

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) installed.
- Firebase CLI installed (`npm i -g firebase-tools`).

### 1. Setup
```bash
bun install
```

### 2. Environment
Copy `.env.example` to `.env.local` and fill in your Firebase config:
```bash
cp .env.example .env.local
```

### 3. Local Development
Run the frontend:
```bash
bun dev
```

Run Firebase emulators (optional, for Functions testing):
```bash
bun run dev:emulators
```

### 4. Deployment
Deploy to Firebase Hosting and Cloud Functions:
```bash
bun run deploy
```

## Usage on Raspberry Pi
1. Install Raspberry Pi OS (Desktop).
2. Open Chromium.
3. Navigate to your deployed URL.
4. Press F11 for Full Screen.
5. (Optional) Use a kiosk mode extension or script to auto-launch on boot.

## Project Structure
- `src/components/dashboard`: Core grid layout logic.
- `src/components/frames`: Individual widget components.
- `functions`: Firebase Cloud Functions (Node.js 20).
- `src/hooks`: Data management hooks.