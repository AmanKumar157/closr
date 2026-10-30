# CareerPilot 🚀

> **Bridge the skill gap between your resume and your target dream role with AI.**

CareerPilot is an AI-powered MERN stack platform that parses resumes, matches them against target Job Descriptions (JD), detects skill gaps, generates an actionable 12-week roadmap with exactly one best verified resource per milestone, tracks learning progress, allows users to re-analyze updated resumes to view score improvements, and exports ATS-friendly PDF resumes.

---

## 📌 Architecture & Tech Stack

```text
UI (React + Tailwind + Recharts)
   ↓
State Layer (Context API + Custom Hooks)
   ↓
Service Layer (Axios with withCredentials)
   ↓
Backend API (Express ES Modules + Mongoose)
   ├── AI Engine (@google/genai - Gemini)
   ├── Resource Resolver (YouTube Data API v3 + Official Docs Registry)
   └── PDF Engine (Puppeteer Headless Chromium)
```

- **Frontend**: React (Vite), Tailwind CSS, React Router v6, Axios, Context API + custom hooks, React Hook Form, Recharts, react-hot-toast, Lucide React icons.
- **Backend**: Node.js, Express (ES modules), Mongoose, jsonwebtoken, bcrypt, cookie-parser, Multer (memory storage), pdf-parse, mammoth, Zod, helmet, cors, express-rate-limit, dotenv.
- **AI**: `@google/genai` (Google Gemini with dynamic model name via `GEMINI_MODEL`).
- **External APIs**: YouTube Data API v3 (resource resolving with query caching).
- **PDF Generation**: Puppeteer (A4, 15mm margins, printBackground).
- **Database**: MongoDB Atlas.

---

## 🌟 Implemented Features (F1 – F10)

| ID | Feature | Description |
|---|---|---|
| **F1** | **Authentication** | Register, login, logout with token blacklisting, JWT in httpOnly cookie, protected routes. |
| **F2** | **Profile** | Current skills (editable chips), target role, default JD, and preferred language (`en`/`hi`). |
| **F3** | **Resume Upload & Parsing** | PDF/DOCX text extraction via Multer memory storage, scanned-document protection (>200 chars). |
| **F4** | **AI Gap Analysis** | Honest ATS match score (0-100), matched vs missing skills (high/medium/low), weak sections, suggestions. |
| **F5** | **Skill-Gap to 12-Week Roadmap** | 12 structured weeks with 2-4 deliverable milestones per week driving skill gap resolution. |
| **F6** | **Resource Generator** | Exactly 1 curated resource per milestone (Video, Docs, Article, Practice), lazy resolving, cache, and swap. |
| **F7** | **Progress Tracker** | Milestone checkboxes, week and overall completion bars, resource learning status chips (`not_started`, `viewed`, `done`). |
| **F8** | **ATS Resume Generator** | Rewrites resume into clean, semantic single-column HTML and streams A4 PDF via Puppeteer. |
| **F9** | **History & Compare** | Full audit trail of past analyses, roadmaps, and resumes; select any 2 analyses to view side-by-side skill diffs. |
| **F10**| **Re-Analysis Loop** | Re-upload updated resume against an existing roadmap to view score delta and optionally regenerate roadmap for remaining gaps. |

---

## 📂 Project Structure

```text
careerpilot/
├── package.json
├── .gitignore
├── README.md
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── common/ (Button, Card, Input, Loader, ProgressBar, ScoreGauge, SkillChip)
│       ├── context/ (AuthContext.jsx)
│       ├── hooks/ (useAuth.js)
│       ├── routes/ (ProtectedRoute.jsx)
│       ├── services/ (axiosInstance, authService, profileService, analysisService, roadmapService, progressService, resumeService)
│       └── features/
│           ├── auth/ (LoginForm, RegisterForm, LoginPage, RegisterPage)
│           ├── profile/ (ProfileForm, ProfilePage)
│           ├── analysis/ (ResumeDropzone, NewAnalysisPage, AnalysisResultPage)
│           ├── roadmap/ (ResourceCard, RoadmapTimelinePage)
│           ├── tracker/ (TrackerPage)
│           ├── resume/ (ResumeGeneratorPage)
│           └── history/ (HistoryPage)
└── server/
    ├── .env.example
    ├── package.json
    ├── tests/ (auth.test.js, parser.test.js, gemini.test.js, roadmap.test.js)
    └── src/
        ├── app.js
        ├── server.js
        ├── config/ (db.js, env.js, docsMap.js)
        ├── controllers/ (auth, profile, analysis, roadmap, progress, resume)
        ├── middleware/ (auth, errorHandler, rateLimit, upload, validate)
        ├── models/ (User, BlacklistedToken, Profile, Analysis, Roadmap, ResourceCache, GeneratedResume)
        ├── routes/ (auth, profile, analysis, roadmap, progress, resume)
        ├── services/ (gemini.service.js, prompts.js, parser.service.js, resource.service.js, pdf.service.js)
        ├── utils/ (ApiError.js, apiResponse.js, asyncHandler.js)
        └── validators/ (auth, profile, analysis)
```

---

## 🚀 Local Development Setup

### 1. Environment Configuration

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/careerpilot?retryWrites=true&w=majority
JWT_SECRET=supersecretjwtkey_careerpilot_2025_change_this_in_production
JWT_EXPIRES_IN=7d

# Gemini AI (Dynamic Model Name)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# YouTube Data API v3 (Resource Resolving)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=/api
```

### 2. Start Servers

```bash
# Terminal 1: Backend API
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Tests

```bash
cd server
npm test
```
All 24 automated unit and integration tests will run using Node.js built-in test runner.

---

## 🌐 Production Deployment Guide

### A. Deploy Backend on Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Root Directory: `server`.
3. Build Command: `npm install`.
4. Start Command: `node src/server.js`.
5. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
   - `MONGODB_URI`: your MongoDB Atlas connection string
   - `JWT_SECRET`: a long random secure string
   - `GEMINI_API_KEY`: your Google Gemini API key
   - `GEMINI_MODEL`: `gemini-1.5-flash`
   - `YOUTUBE_API_KEY`: your YouTube Data API v3 key

### B. Deploy Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Root Directory: `client`.
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Environment Variables:
   - `VITE_API_URL`: `https://your-render-backend.onrender.com/api`
7. Add `vercel.json` rewrites for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
