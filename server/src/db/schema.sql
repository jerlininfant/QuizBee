-- ==============================================================================
-- QUIZBEE — SUPABASE POSTGRESQL DATABASE SCHEMA
-- Specification: Section 21 (Database Architecture)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'player', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ------------------------------------------------------------------------------
-- 2. QUIZZES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL DEFAULT 'General',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    question_count INTEGER NOT NULL DEFAULT 5 CHECK (question_count > 0),
    time_per_question INTEGER NOT NULL DEFAULT 20 CHECK (time_per_question >= 5),
    mode VARCHAR(20) NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'team')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for host quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_host_id ON quizzes(host_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for ordering questions by quiz
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id_order ON questions(quiz_id, order_index ASC);

-- ------------------------------------------------------------------------------
-- 4. ROOMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'paused', 'finished')),
    current_question_index INTEGER NOT NULL DEFAULT 0,
    question_start_time BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for lightning-fast room code lookup
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- ------------------------------------------------------------------------------
-- 5. TEAMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_room_team_name UNIQUE(room_id, name)
);

-- Index for room teams
CREATE INDEX IF NOT EXISTS idx_teams_room_id ON teams(room_id);

-- ------------------------------------------------------------------------------
-- 6. PLAYERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    socket_id VARCHAR(100),
    connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for player lookups
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);

-- ------------------------------------------------------------------------------
-- 7. ANSWERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer CHAR(1) NOT NULL CHECK (answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL DEFAULT false,
    response_time NUMERIC(6, 2) NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0 AND points <= 1000),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_player_question_answer UNIQUE (room_id, player_id, question_id)
);

-- Indexes for answers aggregation and duplicate checking
CREATE INDEX IF NOT EXISTS idx_answers_room_question ON answers(room_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures authoritative backend isolation: public clients cannot tamper with scores.
-- ------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Allow service_role key full authoritative access across all tables
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role has full access to users" ON users;
    CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to quizzes" ON quizzes;
    CREATE POLICY "Service role has full access to quizzes" ON quizzes FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to questions" ON questions;
    CREATE POLICY "Service role has full access to questions" ON questions FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to rooms" ON rooms;
    CREATE POLICY "Service role has full access to rooms" ON rooms FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to teams" ON teams;
    CREATE POLICY "Service role has full access to teams" ON teams FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to players" ON players;
    CREATE POLICY "Service role has full access to players" ON players FOR ALL USING (true);

    DROP POLICY IF EXISTS "Service role has full access to answers" ON answers;
    CREATE POLICY "Service role has full access to answers" ON answers FOR ALL USING (true);
END $$;
