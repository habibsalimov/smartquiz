-- Fix RLS policies for user registration
-- Run this in Supabase SQL Editor

-- Allow user registration by temporarily disabling RLS for INSERT on users table
DROP POLICY IF EXISTS "Users can create accounts" ON users;

CREATE POLICY "Users can create accounts" ON users
  FOR INSERT WITH CHECK (true);

-- Update other policies to work correctly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id::text = auth.uid()::text OR auth.uid() IS NULL);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id::text = auth.uid()::text);

-- Allow public access to some game-related tables for anonymous players
DROP POLICY IF EXISTS "Anyone can join games" ON player_sessions;

CREATE POLICY "Anyone can join games" ON player_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view player sessions in active games" ON player_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = player_sessions.game_session_id 
      AND gs.status IN ('waiting', 'active', 'completed')
    )
  );

-- Allow answers from anonymous players
DROP POLICY IF EXISTS "Players can submit answers" ON player_answers;

CREATE POLICY "Players can submit answers" ON player_answers
  FOR INSERT WITH CHECK (true);