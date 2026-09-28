# QUIZBEE — Upload. Generate. Compete. Win.

> AI-Powered Competitive Learning Arena. Turn your study material into interactive competitive multiplayer quizzes in real-time.

---

## 🚀 Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express.js
- **Real-Time Engine**: Socket.IO (bidirectional WebSocket transport)
- **Database / Auth**: Supabase PostgreSQL + Auth (with seamless local persistence store fallback for out-of-the-box local testing)
- **AI Engine**: OpenAI API (`gpt-4o-mini`) + Domain Heuristic Question Generator fallback

---

## 📁 Project Architecture

```
QUIZBEE/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Footer, Timer, etc.
│   │   ├── context/            # AuthContext (JWT & Supabase session state)
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx         # (/) Full Hero, Features, & Battle Cycle
│   │   │   ├── LoginPage.jsx           # (/login) Host authentication
│   │   │   ├── RegisterPage.jsx        # (/register) Host registration
│   │   │   ├── HostDashboard.jsx       # (/host) Statistics & Quiz library
│   │   │   ├── HostCreateQuiz.jsx      # (/host/create) File upload (PDF/DOCX/PPTX/TXT) & AI generator
│   │   │   ├── HostQuizEditor.jsx      # (/host/quiz/:id) 8-control Question Editor
│   │   │   ├── HostRoom.jsx            # (/host/room/:code) Host Live Leaderboard & controls
│   │   │   ├── JoinQuizPage.jsx        # (/join) Room code & player nickname entry
│   │   │   ├── PlayerWaitingRoom.jsx   # (/player/room/:code) Squads (max 4) & Lobby
│   │   │   ├── PlayerQuizRoom.jsx      # (/player/quiz/:code) Timed HUD, answer locking & speed bonus
│   │   │   └── FinalResultsPage.jsx    # (/results/:code) Podium, analytics table & confetti
│   │   ├── services/           # api.js & socket.js
│   │   ├── App.jsx             # React Router with protected host guards
│   │   └── main.jsx
│   ├── vite.config.js          # Port 5173 with proxy to backend
│   └── tailwind.config.js
│
├── server/                     # Express & Socket.IO Backend
│   ├── src/
│   │   ├── config/             # env.js & supabase.js
│   │   ├── controllers/        # auth, quiz, room, ai
│   │   ├── data/               # store.js (authoritative in-memory & DB persistence)
│   │   ├── middleware/         # authMiddleware & uploadMiddleware (PDF, DOCX, PPTX, TXT)
│   │   ├── routes/             # auth, quiz, room, ai REST endpoints
│   │   ├── services/
│   │   │   ├── aiService.js        # OpenAI structured JSON generation + fallback
│   │   │   ├── fileService.js      # pdf-parse, mammoth text extractor
│   │   │   ├── roomService.js      # Room codes (e.g. QZB482), squad limits
│   │   │   └── scoringService.js   # Authoritative speed bonus scoring (up to 1000 pts)
│   │   ├── socket/             # socketHandler.js (12 real-time Socket.IO events)
│   │   └── server.js           # Port 5000 entry point
│   ├── .env.example
│   └── test_flow.js            # End-to-end integration test suite
│
└── package.json                # Root scripts
```

---

## ⚡ Quick Start (Running Locally)

### 1. Install Dependencies
```bash
# From the root directory:
npm run install:all
```

### 2. Configure Environment (Optional)
Check `server/.env`. By default it runs seamlessly out of the box with built-in persistence and test datasets.
To connect your live OpenAI key or Supabase database:
```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
```

### 3. Start Server & Client
In two terminals:
```bash
# Terminal 1: Backend Server (Port 5000)
npm run server

# Terminal 2: Frontend Client (Port 5173)
npm run client
```

Now open **http://localhost:5173** in your browser!

---

## 🎮 Core Flow Demonstration

1. **Host Login**: Use pre-seeded host credentials `host@quizbee.com` / `password123` (or click "Auto-fill Pre-seeded Host Account" on `/login`).
2. **Create Quiz**:
   - Go to `/host/create`.
   - Upload study files (`.pdf`, `.docx`, `.pptx`, `.txt`) or enter a topic manually.
   - Select difficulty, question count, time per question, and Solo/Team mode.
   - Watch the animated 4-step AI generation progress.
3. **Question Editor**:
   - Review and fine-tune questions, edit choices, change correct answers, regenerate specific questions, or reorder them.
   - Click **LAUNCH ROOM NOW**.
4. **Host Live Console**:
   - Host receives a unique code like `QZB482`.
   - The primary **Live Leaderboard** is displayed on the Host system.
   - Host has controls: `Start Quiz`, `Pause`, `Resume`, `Next Question`, `End Quiz`.
5. **Players Compete**:
   - In another browser tab/window or mobile device, go to **http://localhost:5173/join**.
   - Enter the room code and nickname.
   - Select or create squads (max 4 members) if Team Battle.
   - Submit answers before timer runs out.
   - Server calculates speed bonus + accuracy in real time (up to 1000 points per question).
6. **Podium & Results**:
   - Confetti celebration, top 3 champions podium, and breakdown of correct, wrong, accuracy %, and average speed.
