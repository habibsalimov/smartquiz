# Database Migrations

## Required Migration: Unique Player Constraint

**Problem:** Players can create duplicate entries when joining games rapidly due to race conditions.

**Solution:** Add a unique constraint to prevent duplicate `(game_session_id, nickname)` combinations.

### To Apply Migration:

1. **Log into Supabase Dashboard:**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the migration:**
   ```sql
   -- Execute the contents of add_unique_player_constraint.sql
   ALTER TABLE player_sessions 
   ADD CONSTRAINT unique_player_per_game 
   UNIQUE (game_session_id, nickname);

   CREATE INDEX IF NOT EXISTS idx_player_sessions_game_nickname 
   ON player_sessions (game_session_id, nickname);
   ```

3. **Verify the constraint:**
   ```sql
   -- Check if constraint was added successfully
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'player_sessions' 
   AND constraint_type = 'UNIQUE';
   ```

### What this fixes:
- ✅ Prevents duplicate players with same nickname in same game
- ✅ Handles race conditions at database level
- ✅ Improves query performance with index
- ✅ Works together with backend upsert logic

### Note:
This migration is **required** for the duplicate player fix to work properly. The backend code now uses PostgreSQL's `ON CONFLICT` feature which depends on this unique constraint.