# ✿ focusly — neo-y2k study timer

> A pastel, kawaii-styled study companion built with React + Vite. Track your study sessions, manage your syllabus, analyse your progress, and log mistakes — all wrapped in a neo-y2k aesthetic with chunky borders, hard offset shadows, and floating stickers.

---

## ✨ Design System — Neo-Y2K Kawaii

| Element | Detail |
|---|---|
| **Fonts** | Fredoka (UI) + Caveat (headers) via Google Fonts |
| **Background** | Pastel radial-gradient blobs — pink / lilac / mint / sunny |
| **Borders** | 2.5px solid `#4a2d5e` (ink) |
| **Shadows** | Hard offset `5px 5px 0 var(--ink)` — no blur |
| **Buttons** | Rounded pill buttons with hover lift effect |
| **Cards** | Bubble cards with `28px` radius + blur backdrop |
| **Stickers** | 8 floating emoji stickers drifting in the background (✿ ⭐ 🎀 ✨ ☁️ 🌸 🍬 🌷) |
| **Clock** | Live top-bar clock in a chunky pill |

---

## 🚀 Features

### 🏠 Dashboard
- **Today's snapshot** — streak, hours studied, exam countdown, session count
- **Progress ring** — visual ring showing how close you are to your daily target
- **Quick start** — one-click buttons to jump to any section
- **Syllabus overview** — see all subject completion rates at a glance
- **Recent sessions** — last 5 sessions with subject colour chips

### ⏱ Pomodoro Timer
- **4 preset modes** — Standard (25/5), Ultradian (52/17), Prep Mode (50/10), Exam Simulation (3h lock)
- **Cycle pips** — visual pip track showing focus cycles completed
- **Custom durations** — adjust focus, short break, long break, and cycle count
- **Session metadata** — pick a subject, session name, and tag (New Topic / Revision / Practice / Mock Test)
- **Auto-advance breaks** — break timer starts automatically after a focus cycle ends
- **Confidence rating** — rate each session 1–5 stars on completion
- **Session notes** — journal entry saved with each session
- **Focus score** — automatic score deducted per pause (penalises distraction)
- **Exam Sim lock** — 3-hour locked mode that mimics real exam conditions

### 📚 Syllabus Tracker
- Add subjects with a custom colour
- Add topics under each subject
- Add sub-topics under each topic
- Cycle topic status: `not started → in progress → completed → needs revision`
- Progress bar per subject showing % completion

### 📊 Analytics
- **Bar chart** — study hours for the last 7 days
- **Donut chart** — time split across subjects
- **Week-over-week delta** — compare this week vs last week with a % delta
- **Activity heatmap** — GitHub-style 365-day contribution graph (click any day for details & session log)
- **Practice test tracker** — log mock test scores with marks breakdown, filter by subject/topic, score trend line chart
- **Weak spot detection** — identifies subjects studied often but rated hard, with a priority recommendation

### ☁️ Account & Settings
- **Google sign-in** via Firebase — syncs all data to Firestore across devices
- **Offline / local mode** — works fully offline using localStorage when not signed in
- **Exam goal manager** — set exam name, date, and daily target (hours/day)
- **Export backup** — download all data as a JSON file
- **Clear cache** — wipe local data

---

## 🗑️ Removed Features
The following features were intentionally removed to keep the app focused:

- ~~Momentum Falling~~ — weekly momentum stat & fortune quote window
- ~~Daily Planner~~ — per-subject daily target checklist
- ~~Weekly Challenges~~ — auto-generated quests (consistency, time stretch, personal best)
- ~~Gamification Recovery~~ — streak freeze tokens, streak rescue banner
- ~~Active Recall Flashcard Reviewer~~ — SM-2 spaced repetition card deck

---

## 🛠 Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 18 |
| Build | Vite |
| Styling | Vanilla CSS (custom neo-y2k design system) |
| Charts | Recharts |
| Auth | Firebase Authentication (Google) |
| Database | Firebase Firestore (cloud) / localStorage (offline) |
| Fonts | Google Fonts — Fredoka, Caveat |

---

## ⚡ Getting Started

```bash
# Install dependencies
cd web
npm install

# Set up Firebase (optional — for cloud sync)
cp .env.example .env
# Fill in your Firebase project credentials in .env

# Start dev server
npm run dev

# Build for production
npm run build
```

> **Without Firebase credentials**, the app runs fully offline using `localStorage`. All features work except cross-device sync.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Dashboard |
| `2` | Timer |
| `3` | Syllabus |
| `4` | History |
| `5` | Analytics |
| `6` | Account |
| `7` | Mistake Log |

> Shortcuts are disabled while a timer session is active.

---

## 📁 Project Structure

```
web/
├── src/
│   ├── App.jsx          # All views and components
│   ├── index.css        # Neo-y2k design system (tokens, layout, components)
│   ├── main.jsx         # React entry point
│   ├── firebase.js      # Firebase config + auth helpers
│   └── services/
│       └── dataService.js  # Firestore / localStorage data layer
├── public/
└── index.html
```

---

## 🎨 Color Palette

```css
--pink:        #ffb6d9   /* bubble pink */
--lilac:       #c8b6ff   /* soft purple */
--mint:        #b8f3d6   /* mint green */
--sun:         #ffe27a   /* sunny yellow */
--ink:         #4a2d5e   /* dark ink (borders & text) */
--cream:       #fff4fb   /* off-white background */
```

---

*made with 🌸 by Aspharier*
