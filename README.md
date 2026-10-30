# CareerPilot 🚀

> **Bridge the skill gap between your resume and your target dream role with AI.**

CareerPilot is an AI-powered MERN stack platform that parses resumes, matches them against target Job Descriptions (JD), detects skill gaps, generates an actionable 12-week roadmap with exactly one best verified resource per milestone, and allows users to re-analyze updated resumes to track score improvements and export ATS-friendly resumes.

---

## 📌 Architecture & Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router, Axios, Context API + custom hooks, React Hook Form, Recharts, react-hot-toast, Lucide icons.
- **Backend**: Node.js, Express (ES modules), Mongoose, jsonwebtoken, bcrypt, cookie-parser, Multer (memory storage), pdf-parse, mammoth, Zod, helmet, cors, express-rate-limit, dotenv.
- **AI**: `@google/genai` (Google Gemini with dynamic model name).
- **External APIs**: YouTube Data API v3 (resource resolver).
- **PDF Generation**: Puppeteer / `@sparticuz/chromium`.
- **Database**: MongoDB Atlas.

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
│       │   └── common/ (Button.jsx, Card.jsx, Input.jsx, Loader.jsx)
│       ├── context/ (AuthContext.jsx)
│       ├── hooks/ (useAuth.js)
│       ├── routes/ (ProtectedRoute.jsx)
│       ├── services/ (axiosInstance.js, authService.js)
│       └── features/
│           └── auth/
│               ├── components/ (LoginForm.jsx, RegisterForm.jsx)
│               └── pages/ (LoginPage.jsx, RegisterPage.jsx)
└── server/
    ├── .env.example
    ├── package.json
    ├── tests/ (auth.test.js)
    └── src/
        ├── app.js
        ├── server.js
        ├── config/ (db.js, env.js)
        ├── controllers/ (auth.controller.js)
        ├── middleware/ (auth.js, errorHandler.js, rateLimit.js, validate.js)
        ├── models/ (User.js, BlacklistedToken.js)
        ├── routes/ (auth.routes.js)
        ├── utils/ (ApiError.js, apiResponse.js, asyncHandler.js)
        └── validators/ (auth.validator.js)
```

---

## 🚀 Quick Start (Phase 1)

### 1. Environment Configuration

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/careerpilot?retryWrites=true&w=majority
JWT_SECRET=supersecretjwtkey_careerpilot_2025_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=/api
```

### 2. Run Backend
```bash
cd server
npm run dev
```

### 3. Run Frontend
```bash
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Automated Tests
```bash
cd server
npm test
```
