-- Migration: Add unique constraint to prevent duplicate players in same game
-- This prevents race conditions at the database level

-- Add unique constraint on (game_session_id, nickname) combination
ALTER TABLE player_sessions 
ADD CONSTRAINT unique_player_per_game 
UNIQUE (game_session_id, nickname);

-- Add index for performance on lookups
CREATE INDEX IF NOT EXISTS idx_player_sessions_game_nickname 
ON player_sessions (game_session_id, nickname);