<div align="center">

# ⬡ SignalSync
### Adaptive Urban Route Architecture — Intelligent Traffic Grid

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)](https://firebase.google.com/)
[![Google Maps](https://img.shields.io/badge/Google_Maps_API-enabled-4285F4?logo=google-maps)](https://developers.google.com/maps)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

**Team Merge_Conflicts · India Innovates Hackathon**

*A real-time AI-powered urban traffic intelligence platform with live green corridor management for emergency vehicles across 8 major Indian cities.*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [The Problem We're Solving](#-the-problem-were-solving)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Pages & Routes](#-pages--routes)
- [Green Corridor System](#-green-corridor-system)
- [City Coverage](#-city-coverage)
- [Firebase Setup](#-firebase-setup)

---

## 🌐 Overview

SignalSync is a full-stack Next.js web application built by **Team Merge_Conflicts** for the **India Innovates Hackathon**. It demonstrates how real-time traffic intelligence and green corridor preemption can save lives by eliminating red-light delays for emergency vehicles.

**Three core pillars:**

| Pillar | What It Does |
|---|---|
| **AI Traffic Vision** | Live intersection density simulation with real named chowks per city |
| **Green Corridor Portal** | Dispatcher creates a zero-stop signal priority path for ambulances, fire trucks & VVIP convoys |
| **Live Dashboard** | City-wide traffic control center showing all active corridors and node statuses in real time |

---

## 🚨 The Problem We're Solving

- 🏥 Ambulances spend **10–15% of journey time** idling at red lights, cutting into the critical 60-minute "Golden Hour"
- 🛡️ VVIP convoys stopped at traffic lights become **static security targets**
- 🚗 Fixed-timer signals waste fuel on empty lanes every single day

SignalSync solves all three with a connected signals platform that a dispatcher can trigger in seconds.

---

## ✨ Key Features

### 🏠 Homepage
- Animated intersection hero — traffic light cycling N-S / E-W phases
- Ambulance emoji correctly oriented (faces right, drives left-to-right)
- Problem statement, three-pillar architecture, user flows

### 🗺️ Portal (`/portal`)
- **City selector** — Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad
- **📍 Use My Location** — one-tap GPS button (browser Geolocation API) sets real GPS coordinates as route origin
- **Route Finder** with live traffic-aware Google Directions (departure-time + `BEST_GUESS` traffic model)
- **Initiate Green Wave** — saves corridor to Firestore, auto-selects 5 real city intersections along the route
- **CorridorStatusBox** — animated GREEN ✓ / PREP ⏱ / QUEUED badges per intersection node
- **Traffic signal circle overlays** on the map — colored rings at each node show live signal state
- **Start Live GPS Tracking** — `watchPosition()` tracks vehicle with pulsing blue dot, map auto-recenters at zoom 15
- **Auto-terminate** — corridor removed from Firestore + localStorage 2.5 s after vehicle reaches destination

### 📊 Dashboard (`/dashboard`)
- **City picker** — select from 8 supported cities; all data refreshes instantly
- **Intersection Nodes grid** — real named chowks for the selected city with live density fluctuation
- **Live Green Corridors** — filtered per selected city; polls Firestore + localStorage every 1.5 s
- **Demo Corridor** sidebar — animated CorridorStatusBox using city-specific intersection names
- **Lane Density** — city-specific major road names with live load bars

### 🔐 Auth (`/auth/login`, `/auth/register`)
- Firebase Authentication (Email/Password)
- Role-based access — `admin` role unlocks vehicle number override + full admin panel

### ⚙️ Admin Panel (`/admin`)
- Admin-only route guarded by Firestore role check

### 🔍 Route Finder (`/routes`)
- Standalone route search with city-bounded Google Places Autocomplete

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS 3 + custom CSS design tokens |
| Maps | `@react-google-maps/api` — Maps JS, Directions, Places Autocomplete |
| GPS Tracking | Browser Geolocation API (`getCurrentPosition` + `watchPosition`) |
| Auth | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore (real-time corridor sync) |
| State | React hooks — `useState`, `useEffect`, `useRef`, `useCallback` |
| Realtime | Firestore `onSnapshot` + `localStorage` polling (1.5 s) |

---

## 📁 Project Structure

```
India_Innovates_Merge_Conflicts/
│
├── README.md                     ← You are here
│
└── SignalSync/                    ← Next.js application root
    │
    ├── app/                      # Pages (Next.js App Router)
    │   ├── layout.jsx            # Root layout — AuthProvider, global styles
    │   ├── globals.css           # Design tokens, animations, utility classes
    │   ├── page.jsx              # Homepage — animated hero, traffic light, ambulance
    │   ├── portal/
    │   │   └── page.jsx          # Green Corridor portal — GPS, route finder, wave activation
    │   ├── dashboard/
    │   │   └── page.jsx          # Live city dashboard — nodes, corridors, demo
    │   ├── routes/
    │   │   └── page.jsx          # Standalone route finder
    │   ├── admin/
    │   │   └── page.jsx          # Admin panel (role-gated)
    │   └── auth/
    │       ├── login/page.jsx    # Sign-in page
    │       └── register/page.jsx # Registration page
    │
    ├── components/
    │   ├── DelhiMap.jsx          # Google Maps — GPS dot, signal circle overlays,
    │   │                         #   DirectionsRenderer, TrafficLayer, MovingAmbulance
    │   ├── CorridorStatusBox.jsx # Animated GREEN / PREP / QUEUED status per node
    │   ├── AuthProvider.jsx      # Firebase auth context + user profile from Firestore
    │   ├── Badge.jsx             # Styled badge pill (cyan / green / red / violet)
    │   ├── StatusDot.jsx         # Pulsing colored dot indicator
    │   └── Navbar.jsx            # Shared navigation bar
    │
    ├── lib/
    │   ├── firebase.js           # Firebase app + Auth + Firestore initialisation
    │   ├── firestore.js          # Firestore helpers — createCorridor, terminateCorridor,
    │   │                         #   subscribeActiveCorridors, setSignalStatus
    │   └── cityNodes.js          # Real intersection data for 8 cities (~17 nodes each)
    │                             #   + pickCorridorNodes() geographic selection helper
    │
    ├── .env.local                # 🔑 Environment variables 
    ├── next.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18 ([nodejs.org](https://nodejs.org) — download LTS, check "Add to PATH" during install)
- A **Google Cloud** project with these APIs enabled:
  - ✅ Maps JavaScript API
  - ✅ Directions API
  - ✅ Places API
- A **Firebase** project with:
  - ✅ Authentication → Email/Password enabled
  - ✅ Cloud Firestore database created

### 1. Clone the repository

```bash
git clone https://github.com/prathamb9/India_Innovates_Merge_Conflicts.git
cd India_Innovates_Merge_Conflicts
```

### 2. Navigate into the app folder

```bash
cd SignalSync
```

> ⚠️ **Important:** All commands below must be run from inside `SignalSync/`, not from the repo root.

### 3. Install dependencies

```bash
npm install
```

> **⚠️ If `npm install` throws dependency errors**, run with force flag instead:
> ```bash
> npm install --force
> ```

### 4. Configure environment variables

Create a file named `.env.local` inside `SignalSync/` (see [Environment Variables](#-environment-variables) below).

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the SignalSync homepage. 🎉

### 6. Build for production (optional)

```bash
npm run build
npm run start
```

---

## 🔑 Environment Variables

Create `SignalSync/.env.local` with your keys:

```env
# ── Google Maps ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# ── Firebase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put admin/secret keys in these variables.

---

## 📄 Pages & Routes

| Route | Description | Auth Required |
|---|---|---|
| `/` | Homepage — animated hero, problem statement, pillars | No |
| `/dashboard` | City traffic dashboard — live nodes, corridors, demo | No |
| `/portal` | Green corridor creation & GPS navigation | Yes (for full features) |
| `/routes` | Standalone route finder with autocomplete | No |
| `/admin` | Admin panel | Yes (admin role) |
| `/auth/login` | Sign in with email/password | No |
| `/auth/register` | Create a new account | No |

---

## 🚑 Green Corridor System

### End-to-End Flow

```
1. Operator opens /portal → selects city → enters origin & destination
         ↓
2. [Optional] Tap 📍 to auto-fill origin from device GPS (one-tap, no continuous tracking)
         ↓
3. Click "Get Best Route"
   → Google Directions fetches traffic-aware route with live departure-time model
         ↓
4. Click "Initiate Green Wave"
   → pickCorridorNodes() selects 5 real chowks closest to the route path
   → Corridor saved to Firestore + localStorage
   → Colored signal circle overlays appear on map (🟢 GREEN / 🟡 AMBER / 🔴 RED)
         ↓
5. Demo ambulance drives the route on the embedded Google Map
   → Each node fires onNodeAdvance() callback
   → CorridorStatusBox updates live (GREEN → PREP → QUEUED cascade)
   → Dashboard polls localStorage every 1.5 s and mirrors the status
         ↓
6. [During physical travel] Tap "Start Live GPS Tracking"
   → watchPosition() tracks vehicle — pulsing blue dot follows on map at zoom 15
   → GPS tracking runs ONLY during travel, NOT during corridor creation
         ↓
7. Vehicle arrives → auto-terminate fires after 2.5 s grace period
   → Corridor removed from Firestore + localStorage
   → Dashboard and portal both reset automatically
```

### Signal States

| State | Badge | Meaning |
|---|---|---|
| `GREEN ✓` | 🟢 Green circle on map | Ambulance is at this intersection — full green |
| `PREP ⏱` | 🟡 Amber circle | Next intersection — signal preparing to clear |
| `QUEUED` | 🔴 Red circle | Downstream — cross-traffic held red |
| `✓ CLEAR` | 🟢 Dim green | Ambulance has passed — signal returned to normal cycle |

---

## 🏙️ City Coverage

| City | State | Key Intersections |
|---|---|---|
| **Delhi** | Delhi NCR | Dwarka Sector 12, Connaught Place, AIIMS, Rohini, Karol Bagh… |
| **Mumbai** | Maharashtra | Dadar TT Circle, Andheri Junction, BKC, Borivali, Thane… |
| **Bengaluru** | Karnataka | Silk Board Junction, Hebbal Flyover, Marathahalli, Whitefield… |
| **Hyderabad** | Telangana | Hitech City, Jubilee Hills Check Post, Ameerpet, Gachibowli… |
| **Chennai** | Tamil Nadu | Anna Salai, T. Nagar Pondy Bazaar, Koyambedu Hub, Guindy… |
| **Pune** | Maharashtra | Shivajinagar Circle, Kothrud Depot, FC Road, Hinjewadi… |
| **Kolkata** | West Bengal | Esplanade Crossing, Park Street, Gariahat More, Howrah Station… |
| **Ahmedabad** | Gujarat | Navrangpura Circle, ISCON Circle, SG Highway, Satellite Circle… |

Each city has **17–20 real named intersections** defined in `lib/cityNodes.js`.

---

## 🔥 Firebase Setup

### Firestore Security Rules (recommended)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /corridors/{corridorId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.uid == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

---

## 📞 Emergency Numbers (India)

| Service | Number |
|---|---|
| 🚑 Ambulance (National) | **102** |
| 🚒 Fire Brigade | **101** |
| 👮 Police | **100** |
| 🏥 All Emergencies (GVK EMRI) | **108** |

---

## 🤝 Team

**Team Merge_Conflicts** — India Innovates Hackathon

| Role | Contribution |
|---|---|
| Full-Stack Development | Next.js app, Firebase integration, Google Maps |
| UI/UX Design | Dark-mode design system, animations, responsive layout |
| Data Research | Real intersection coordinates for 8 Indian cities |
| System Architecture | Green corridor algorithm, real-time signal sync |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make changes inside `SignalSync/`
4. Test locally: `npm run dev`
5. Commit: `git commit -m "Add: description of change"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request on GitHub

---

<div align="center">

**Built with ❤️ by [Team Merge_Conflicts](https://github.com/prathamb9/India_Innovates_Merge_Conflicts)**

*SignalSync · India Innovates Hackathon · 2026*

*Saving the Golden Hour, one green signal at a time.*

</div>
