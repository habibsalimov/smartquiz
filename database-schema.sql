-- Kahoot Clone Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image VARCHAR(500),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice',
  time_limit INTEGER DEFAULT 30,
  points INTEGER DEFAULT 1000,
  order_index INTEGER NOT NULL,
  media_url VARCHAR(500),
  media_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answer options table
CREATE TABLE answer_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id),
  host_id UUID REFERENCES users(id),
  game_pin VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting',
  current_question_index INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player sessions table
CREATE TABLE player_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  nickname VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player answers table
CREATE TABLE player_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_session_id UUID REFERENCES player_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  answer_option_id UUID REFERENCES answer_options(id),
  answer_time DECIMAL(10, 2),
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_quizzes_creator ON quizzes(creator_id);
CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_questions_order ON questions(quiz_id, order_index);
CREATE INDEX idx_answer_options_question ON answer_options(question_id);
CREATE INDEX idx_game_sessions_pin ON game_sessions(game_pin);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_player_sessions_game ON player_sessions(game_session_id);
CREATE INDEX idx_player_answers_player ON player_answers(player_session_id);

-- Function to increment player score
CREATE OR REPLACE FUNCTION increment_player_score(player_id UUID, points_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE player_sessions 
  SET score = score + points_to_add 
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get average score for a quiz
CREATE OR REPLACE FUNCTION get_average_score(quiz_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_score DECIMAL;
BEGIN
  SELECT AVG(ps.score) INTO avg_score
  FROM player_sessions ps
  JOIN game_sessions gs ON ps.game_session_id = gs.id
  WHERE gs.quiz_id = quiz_id AND gs.status = 'completed';
  
  RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at 
  BEFORE UPDATE ON quizzes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Quizzes policies
CREATE POLICY "Anyone can view public quizzes" ON quizzes
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own quizzes" ON quizzes
  FOR SELECT USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);

CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid()::text = creator_id::text);

-- Questions policies
CREATE POLICY "Anyone can view questions of public quizzes" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.is_public = true
    )
  );

CREATE POLICY "Quiz creators can manage questions" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND auth.uid()::text = quizzes.creator_id::text
    )
  );

-- Answer options policies
CREATE POLICY "Anyone can view answer options of public quiz questions" ON answer_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN quizzes qz ON q.quiz_id = qz.id
      WHERE q.id = answer_options.question_id 
      AND qz.is_public = true
    )
  );

CREATE POLICY "Quiz creators can manage answer options" ON answer_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN quizzes qz ON q.quiz_id = qz.id
      WHERE q.id = answer_options.question_id 
      AND auth.uid()::text = qz.creator_id::text
    )
  );

-- Game sessions policies
CREATE POLICY "Anyone can view waiting games" ON game_sessions
  FOR SELECT USING (status = 'waiting');

CREATE POLICY "Anyone can view active/completed games" ON game_sessions
  FOR SELECT USING (status IN ('active', 'completed'));

CREATE POLICY "Hosts can manage their games" ON game_sessions
  FOR ALL USING (auth.uid()::text = host_id::text);

-- Player sessions policies
CREATE POLICY "Anyone can join games" ON player_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view player sessions" ON player_sessions
  FOR SELECT USING (true);

CREATE POLICY "Players can update own session" ON player_sessions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Player answers policies
CREATE POLICY "Players can submit answers" ON player_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_sessions ps
      WHERE ps.id = player_answers.player_session_id
      AND (auth.uid()::text = ps.user_id::text OR ps.user_id IS NULL)
    )
  );

CREATE POLICY "Anyone can view player answers" ON player_answers
  FOR SELECT USING (true);