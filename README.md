<div align="center">

# FOCUSLY
### AESTHETIC PAPER PLANNER WORKSPACE & TWO-COLUMN EXAM COMMAND CENTER

[![React](https://img.shields.io/badge/React-19.2-27404a?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-27404a?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Theme](https://img.shields.io/badge/Theme-Digital_Paper_Planner-fef8d3?style=for-the-badge&logo=notion&logoColor=black)](#-design-tokens--aesthetic-paper-planner)
[![Storage](https://img.shields.io/badge/Database-Firestore_%2B_Offline_Cache-0a84ff?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-30d158?style=for-the-badge)](LICENSE)

<br />

> **Focusly** is an ultra-focused personal exam suite inspired by authentic **digital paper planners and notebook spreads**. Designed to eliminate distraction and digital fatigue, it combines cognitive science heuristics—active recall, spaced repetition, countdown velocity—with calming off-white paper textures, ruled checklist lines, dot-grid workspaces, pastel sticky notes, and right-edge index divider tabs.

<br />

<p align="center">
  <img src="docs/screenshots/dashboard-dark.png" alt="Focusly Aesthetic Digital Study Planner Dashboard" width="94%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</p>

</div>

---

## ⚡ Core Highlights

- **📖 Aesthetic Digital Notebook Spread** — Authentic dual-page open book spread framed in a deep slate-teal planner bezel (`#27404a`), shaded center spine crease, right-edge index divider tabs (`MISSIONS`, `SYLLABUS`, `TIPS`, `MANTRA`, `SETTINGS`), and bottom navigation ribbons.
- **📱 Clean Two-Column Architecture**:
  - **Left Page**: 
    - **Planner Date Bar** — Live date display with active weekday dot circle indicator (`S M T W T [F] S`).
    - **Active Exam Countdown** — Hero days-remaining countdown, target examination deadline, and velocity progress bar.
    - **Today's Focus Missions** — Ruled-line paper checklist with circular hand-drawn checkmarks, category badges (`LECTURE`, `PRACTICE`, `REVISION`), target focus budgets, and delete triggers.
    - **Daily Mood Tracker** — Quick daily emotional check-in (`😞 😕 😐 😃 🤩`).
  - **Right Page**:
    - **Hierarchical Syllabus Tree** — Dot-grid background, **closed & collapsed by default** for zero distraction, expandable on click to reveal topics, high-contrast mastery progress bars, status chips (`Mastered`, `Practicing`, `Learning`, `Needs Work`), and subtopic lists.
    - **In-App Subtopic Creator** — Clean modal for adding subtopics without intrusive browser prompts.
- **💡 Cognitive Study Tips & Daily Mantras** — Interactive wisdom deck loaded with learning science principles (Active Recall, Feynman Technique, Spaced Retrieval, Interleaving, Dopamine Detox) and focus mantras with one-click refresh buttons.
- **⚙️ Centered Settings Modal Window** — Instant popup modal (triggered from the header icon or by pressing <kbd>S</kbd>) to configure target exams, manage your Google account, and monitor cloud sync status without full-page navigation.
- **☁️ Multi-Device Google Cloud Persistence** — Seamless Firebase Firestore sync under your Gmail account with zero-latency local caching and instant offline demo session access.
- **🎨 Single Calming Permanent Theme** — Carefully tuned cream paper, soft drop shadows, and high-contrast pastel stationery accents with zero distracting theme switches.
- **📱 100% Fully Responsive** — Side-by-side open spread on desktop displays, gracefully collapsing into a fluid single-column layout on mobile devices and tablets.

---

## 🖥 Visual Walkthrough

### 01 • Open Digital Notebook Spread
*Side-by-side view with active exam countdown, ruled-line daily missions, and closed-by-default syllabus modules.*

<p align="center">
  <img src="docs/screenshots/dashboard-dark.png" alt="Focusly Two-Column Notebook Dashboard" width="94%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</p>

---

### 02 • Dot Grid Syllabus Tree & High-Contrast Mastery Tags
*Expanded subject module showcasing high-contrast pastel status badges, mastery progress bars, status cycle triggers, and subtopic hierarchies.*

<p align="center">
  <img src="docs/screenshots/syllabus-dark.png" alt="Syllabus Architecture" width="94%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</p>

---

### 03 • Centered Settings Insert Modal
*Paper-styled popup window to calibrate target exam goals, deadlines, and view real-time Google cloud persistence status.*

<p align="center">
  <img src="docs/screenshots/settings-dark.png" alt="Settings Modal Insert" width="94%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</p>

---

### 04 • Sign-In Gateway Card
*Clean paper planner gateway card with Google Account authentication and zero-config offline demo session access.*

<p align="center">
  <img src="docs/screenshots/signin.png" alt="Sign-In Gateway" width="94%" style="border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</p>

---

## ⌨️ Fast Keyboard Shortcuts

Focusly is built for keyboard speed:

| Shortcut | Action | Description |
|:---:|:---|:---|
| <kbd>S</kbd> | `TOGGLE SETTINGS` | Open or close the centered settings popup modal |
| <kbd>?</kbd> | `KEYBOARD HELP` | Display global keyboard accelerator overlay |
| <kbd>Esc</kbd> | `DISMISS` | Close any active modal dialog or popup |

---

## 🏛 Clean Architecture & Structure

```
StudyTimer/
├── src/
│   ├── components/
│   │   ├── common/             # Sign-in paper gateway, shortcuts overlay
│   │   ├── dashboard/          # Exam countdown hero card & date bar
│   │   ├── layout/             # AppHeader with book badge, sync pill, settings button & clock
│   │   ├── plan/               # TodayTaskList with ruled paper & circular checkmarks
│   │   ├── settings/           # SettingsModal (centered popup insert), AddGoalModal
│   │   └── syllabus/           # Subject & topic cards, confidence modal
│   ├── pages/
│   │   └── SyllabusPage.jsx    # Dot-grid curriculum tree (closed by default, expand-on-click)
│   ├── services/
│   │   └── dataService.js      # Dual-layer Firestore cloud sync + local cache
│   ├── stores/                 # Zustand state slices (Auth, Exam, Plan, Mock, UI)
│   ├── utils/                  # Date helpers, constants, ID generator
│   ├── index.css               # Aesthetic Digital Paper Planner design system & tokens
│   └── App.jsx                 # Dual-page notebook layout orchestrator & modal hub
├── docs/
│   └── screenshots/            # High-resolution screenshots of all views
├── scripts/
│   └── take-screenshots.js    # Automated Puppeteer screenshot generation
└── vite.config.js              # Vite bundler configuration
```

---

## 🎨 Design Tokens — Aesthetic Paper Planner

```css
/* Core Paper Planner Tokens */
--bg-desk:              #1e313b;                         /* Deep desk surface */
--bezel-color:          #27404a;                         /* Slate-teal binder frame */
--paper-bg:             #ffffff;                         /* Crisp paper page */
--paper-bg-warm:        #fcfbfa;                         /* Shaded page edge */
--text-primary:         #1d2a30;                         /* Deep ink text */
--text-secondary:       #5c6e76;                         /* Soft slate pencil notes */
--ruled-line:           rgba(0, 40, 70, 0.07);           /* Ruled checklist lines */
--dot-grid:             radial-gradient(circle, rgba(0, 40, 70, 0.16) 1px, transparent 1px);
--sticky-blue:          #e4f3fd;                         /* Pastel sky sticky note */
--sticky-yellow:        #fef8d3;                         /* Pastel sunshine note */
--accent-teal:          #16808f;                         /* Planner primary accent */
--radius-notebook:      20px;                            /* Rounded book corners */
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Aspharier/StudyTimer.git
cd StudyTimer

# 2. Install dependencies
npm install

# 3. (Optional) Configure Firebase Cloud Datastore
cp .env.example .env
# Enter your Firebase configuration in .env for cross-device Gmail sync

# 4. Start development server
npm run dev
```

> **Zero-Config Offline Mode**: Firebase setup is optional. Clicking `Enter Offline Demo Session` activates local caching with pre-populated exam preparation modules.

### Production Build & Automated Screenshots

```bash
# Build optimized production bundle
npm run build

# Capture fresh screenshots of the UI
node scripts/take-screenshots.js
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.

---

<div align="center">
  <sub>Designed with precision and elegance by <a href="https://github.com/Aspharier">Aspharier</a>.</sub>
</div>
