# 🏥 MediCore AI — Intelligent Healthcare Platform

> **AI-powered symptom diagnosis · Live video teleconsultation · Real-time pharmacy locator**

MediCore AI is a full-stack healthcare web application built for the **HackNovate Hackathon**. It combines the power of **Google Gemini 2.5 Flash**, **WebRTC peer-to-peer video**, **OpenStreetMap**, and **Supabase** to deliver a complete digital healthcare experience — from AI-driven symptom checking to talking face-to-face with a board-certified doctor, all in one platform.

---

## ✨ Features

### 🤖 AI Symptom Checker & Medical Report Analysis
- Powered by **Google Gemini 2.5 Flash** via the Google GenAI SDK
- Conversational AI that builds a clinical picture through intelligent follow-up questions
- Personalized responses using the patient's profile (age, weight, height)
- **Image/Report Upload** — upload X-rays, blood tests, or prescriptions for instant AI explanation
- Safe home remedy suggestions and escalation advice when specialist care is needed

### 📹 Live Doctor Video Consultation (WebRTC)
- **Peer-to-peer encrypted video calls** powered by **PeerJS (WebRTC)** — no server in the middle
- Doctors can set themselves "Online" to accept incoming calls in real time
- Patients browse available online doctors and connect with a single click
- End-to-end encrypted, HIPAA-conscious architecture

### 🗺️ Nearby Pharmacy Locator
- Real-time map powered by **Leaflet.js** and **OpenStreetMap** (no API key required)
- Detects the user's current GPS location
- Displays all clinics, hospitals, and pharmacies within a configurable radius
- One-tap directions integration

### 👨‍⚕️ Doctor Dashboard
- Dedicated doctor portal with full profile management (name, specialty, license no., bio)
- Avatar photo upload stored in **Supabase Storage**
- WebRTC "Go Online" toggle — instantly makes the doctor discoverable
- Receives and accepts live video call requests in-browser

### 🧑‍💼 Patient Health Vault
- Secure patient profile (age, weight, height)
- Persistent login via **Supabase Auth** (session stored in localStorage — stays logged in until explicit logout)
- Profile data pre-loads AI assistant context for more personalized medical advice

### 🔐 Authentication
- **Google One Tap** (GSI) via `supabase.auth.signInWithIdToken` with nonce verification
- Email/Password sign-up and login
- Role-based routing — Doctor accounts redirect to `/doctor-dashboard`, patients to the main portal
- Hard-redirect post-login prevents stale React state race conditions
- Session persists across browser restarts (no cookie banners needed — uses secure localStorage tokens)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + Vite 8 |
| Routing | React Router DOM v7 |
| AI Model | Google Gemini 2.5 Flash (`@google/genai`) |
| Authentication | Supabase Auth (Google OAuth + Email/Password) |
| Database | Supabase PostgreSQL (Row-Level Security enabled) |
| File Storage | Supabase Storage (avatar uploads) |
| Video Calls | PeerJS (WebRTC) |
| Maps | Leaflet.js + react-leaflet + OpenStreetMap |
| Icons | Lucide React |
| Markdown Rendering | `marked` + `DOMPurify` |
| Styling | Vanilla CSS (Custom Design System) |
| Fonts | Merriweather (headings) + Inter (body) — Google Fonts |

---

## 🎨 Design Philosophy

The UI is inspired by the clean, professional aesthetics of **Mayo Clinic** and **PharmEasy**:
- **Light-mode clinical theme** — crisp whites, deep navy blue (`#00205c`), and teal accents
- **Merriweather** serif headings evoke clinical authority and trust
- Mayo Clinic-style **Diseases & Conditions hero** with A–Z search directory
- PharmEasy-style **horizontal services strip** for quick navigation
- Professional footer with contact details, service links, and social links
- Smooth micro-animations and hover effects throughout

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project with the Generative API enabled
- A [Google OAuth 2.0 Client ID](https://console.cloud.google.com/apis/credentials) configured

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/medicore-ai.git
cd medicore-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Set up your Supabase database

Run these SQL statements in your **Supabase SQL Editor**:

```sql
-- Doctors table
create table doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  specialty text,
  license_no text,
  bio text,
  avatar_url text,
  is_online boolean default false,
  peer_id text,
  created_at timestamptz default now()
);

-- Patients table
create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table doctors  enable row level security;
alter table patients enable row level security;

-- Policies: users can only read/write their own rows
create policy "Doctors: own row access" on doctors
  for all using (auth.uid() = user_id);

create policy "Patients: own row access" on patients
  for all using (auth.uid() = user_id);

-- Allow any authenticated user to READ doctors (for the consult page)
create policy "Doctors: public read" on doctors
  for select using (auth.role() = 'authenticated');
```

### 5. Set up Supabase Storage

In your Supabase Dashboard → **Storage**, create a bucket called `avatars` and set it to **Public**.

### 6. Configure Google OAuth

In **Supabase Dashboard → Authentication → Providers**, enable **Google** and add your OAuth Client ID.

In your [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add these to the **Authorized JavaScript origins**:
```
http://localhost:5173
https://your-production-domain.com
```

### 7. Run the development server
```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Sticky top nav with auth-aware avatar/login button
│   ├── Navbar.css
│   ├── Footer.jsx          # Professional clinic footer
│   └── Footer.css
├── context/
│   └── AuthContext.jsx     # Global auth state (user, profile, role, loading)
├── lib/
│   └── supabase.js         # Supabase client initialization
├── pages/
│   ├── Home.jsx            # Landing page (Mayo Clinic + PharmEasy style)
│   ├── Home.css
│   ├── LoginPortal.jsx     # Role-based login/signup (Doctor / Patient)
│   ├── LoginPortal.css
│   ├── ChatbotPage.jsx     # Gemini AI symptom checker + image analysis
│   ├── Chatbot.css
│   ├── DoctorConsultPage.jsx # Browse online doctors + start WebRTC call
│   ├── DoctorConsult.css
│   ├── DoctorDashboard.jsx   # Doctor's personal portal
│   ├── DoctorDashboard.css
│   ├── NearbyStoresPage.jsx  # Leaflet map pharmacy finder
│   ├── ProfilePage.jsx       # Patient profile editor
│   └── AuthCallback.jsx      # OAuth redirect handler
├── index.css               # Global design tokens, typography, component utilities
└── App.jsx                 # Router setup
```

---

## 🔒 Security Notes

> [!CAUTION]
> **Never commit your `.env` file** to a public repository. The `.gitignore` already excludes it. Rotate your API keys immediately if they were ever exposed.

- All database access is protected by **Supabase Row Level Security (RLS)** — users can only access their own data
- Video calls are **peer-to-peer (WebRTC)** — no media passes through any server
- Image uploads for reports are processed locally in the browser and sent directly to the Gemini API — not stored
- Auth tokens are stored in `localStorage` (standard Supabase SDK behavior) with HTTPS enforcement in production

---

## 🧑‍💻 Authors

Built with ❤️ for the **HackNovate Hackathon**.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
 
