import { supabase, supabaseAdmin } from '../config/supabase.js';
import Joi from 'joi';

// In-memory cache for request deduplication (prevents rapid duplicate requests)
const recentJoinRequests = new Map();
const DEDUP_TIMEOUT = 1000; // 1 second

// Validation schemas
const createGameSchema = Joi.object({
  quizId: Joi.string().uuid().required()
});

const joinGameSchema = Joi.object({
  gamePin: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  nickname: Joi.string().min(2).max(20).required(),
  userId: Joi.string().uuid().optional().allow(null)
});

// Generate random 6-digit PIN
const generateGamePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createGameSession = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Validate input
    const { error, value } = createGameSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { quizId } = value;
    const hostId = req.user.userId;

    // Check if quiz exists and user owns it
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, creator_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.creator_id !== hostId) {
      return res.status(403).json({ error: 'You can only host your own quizzes' });
    }

    // Generate unique game PIN
    let gamePin;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      gamePin = generateGamePin();
      
      const { data: existingGame } = await supabaseAdmin
        .from('game_sessions')
        .select('id')
        .eq('game_pin', gamePin)
        .eq('status', 'waiting')
        .single();

      if (!existingGame) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique game PIN. Please try again.' });
    }

    // Create game session
    const { data: gameSession, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        quiz_id: quizId,
        host_id: hostId,
        game_pin: gamePin,
        status: 'waiting',
        current_question_index: 0
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Game session creation error:', sessionError);
      return res.status(500).json({ error: 'Failed to create game session' });
    }

    res.status(201).json({
      message: 'Game session created successfully',
      gameSession: {
        id: gameSession.id,
        gamePin: gameSession.game_pin,
        quizTitle: quiz.title,
        status: gameSession.status,
        playersCount: 0
      }
    });
  } catch (error) {
    console.error('Create game session error:', error);
    res.status(500).json({ error: 'Failed to create game session' });
  }
};

export const joinGame = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Validate input
    const { error, value } = joinGameSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { gamePin, nickname, userId } = value;

    // Request deduplication: check if same request was made recently
    const requestKey = `${gamePin}-${nickname}`;
    const now = Date.now();
    
    if (recentJoinRequests.has(requestKey)) {
      const lastRequest = recentJoinRequests.get(requestKey);
      if (now - lastRequest < DEDUP_TIMEOUT) {
        console.log(`Duplicate join request blocked for ${nickname} in game ${gamePin}`);
        return res.status(429).json({ error: 'Request too frequent. Please wait a moment.' });
      }
    }
    
    // Record this request
    recentJoinRequests.set(requestKey, now);
    
    // Clean up old entries (simple garbage collection)
    for (const [key, timestamp] of recentJoinRequests.entries()) {
      if (now - timestamp > DEDUP_TIMEOUT) {
        recentJoinRequests.delete(key);
      }
    }

    // Find active game session
    const { data: gameSession, error: gameError } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        *,
        quizzes (title)
      `)
      .eq('game_pin', gamePin)
      .eq('status', 'waiting')
      .single();

    if (gameError || !gameSession) {
      return res.status(404).json({ error: 'Game not found or already started' });
    }

    // Check if nickname is already taken in this game
    const { data: existingPlayer } = await supabaseAdmin
      .from('player_sessions')
      .select('id')
      .eq('game_session_id', gameSession.id)
      .eq('nickname', nickname)
      .single();

    if (existingPlayer) {
      return res.status(400).json({ error: 'Nickname already taken in this game' });
    }

    // Create player session
    const { data: playerSession, error: playerError } = await supabaseAdmin
      .from('player_sessions')
      .insert({
        game_session_id: gameSession.id,
        user_id: userId,
        nickname,
        score: 0
      })
      .select()
      .single();

    if (playerError) {
      console.error('Player session creation error:', playerError);
      return res.status(500).json({ error: 'Failed to join game' });
    }

    // Get all players in the game
    const { data: players } = await supabaseAdmin
      .from('player_sessions')
      .select('id, nickname, score, joined_at')
      .eq('game_session_id', gameSession.id)
      .order('joined_at', { ascending: true });

    // Clear the request from deduplication cache on success
    recentJoinRequests.delete(requestKey);
    
    // Also clear cache on success to allow immediate retry if needed
    recentJoinRequests.clear();

    res.status(201).json({
      message: 'Successfully joined the game',
      playerSession: {
        id: playerSession.id,
        nickname: playerSession.nickname,
        gamePin: gameSession.game_pin,
        quizTitle: gameSession.quizzes?.title
      },
      gameInfo: {
        id: gameSession.id,
        quizTitle: gameSession.quizzes?.title,
        playersCount: players.length,
        players: players.map(p => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score
        }))
      }
    });

    // Emit socket event to notify host and other players
    // We need to import io here or pass it somehow
    // For now, we'll rely on the socket event from the client side
    console.log(`Player ${nickname} joined game ${gameSession.game_pin} via API`);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
};

export const getGameSession = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { gamePin } = req.params;

    const { data: gameSession, error } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        *,
        quizzes (
          id, title, description,
          questions (
            id, question_text, question_type, time_limit, points, order_index,
            answer_options (id, option_text, color)
          )
        ),
        player_sessions (id, nickname, score, joined_at)
      `)
      .eq('game_pin', gamePin)
      .single();

    if (error || !gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    // Sort questions by order_index
    if (gameSession.quizzes?.questions) {
      gameSession.quizzes.questions.sort((a, b) => a.order_index - b.order_index);
    }

    // Sort players by join time
    gameSession.player_sessions.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));

    res.json({
      gameSession: {
        id: gameSession.id,
        gamePin: gameSession.game_pin,
        status: gameSession.status,
        currentQuestionIndex: gameSession.current_question_index,
        quiz: gameSession.quizzes,
        players: gameSession.player_sessions.map(p => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score
        })),
        playersCount: gameSession.player_sessions.length
      }
    });
  } catch (error) {
    console.error('Get game session error:', error);
    res.status(500).json({ error: 'Failed to fetch game session' });
  }
};

export const startGame = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { gamePin } = req.params;
    const hostId = req.user.userId;

    // Verify host and game status
    const { data: gameSession, error: gameError } = await supabaseAdmin
      .from('game_sessions')
      .select('*')
      .eq('game_pin', gamePin)
      .eq('host_id', hostId)
      .eq('status', 'waiting')
      .single();

    if (gameError || !gameSession) {
      return res.status(404).json({ error: 'Game not found or unauthorized' });
    }

    // Check if there are players
    const { data: players } = await supabaseAdmin
      .from('player_sessions')
      .select('id')
      .eq('game_session_id', gameSession.id);

    if (!players || players.length === 0) {
      return res.status(400).json({ error: 'Cannot start game without players' });
    }

    // Update game status
    const { error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', gameSession.id);

    if (updateError) {
      console.error('Game start error:', updateError);
      return res.status(500).json({ error: 'Failed to start game' });
    }

    res.json({
      message: 'Game started successfully',
      gamePin: gameSession.game_pin,
      playersCount: players.length
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
};

export const endGame = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { gamePin } = req.params;
    const hostId = req.user.userId;

    // Verify host and update game status
    const { data: gameSession, error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('game_pin', gamePin)
      .eq('host_id', hostId)
      .select()
      .single();

    if (updateError || !gameSession) {
      return res.status(404).json({ error: 'Game not found or unauthorized' });
    }

    // Get final scores
    const { data: finalScores } = await supabaseAdmin
      .from('player_sessions')
      .select('id, nickname, score')
      .eq('game_session_id', gameSession.id)
      .order('score', { ascending: false });

    res.json({
      message: 'Game ended successfully',
      gamePin: gameSession.game_pin,
      finalScores: finalScores || []
    });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
};

export const getActiveGames = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const userId = req.user?.userId;

    const { data: activeGames, error } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id, game_pin, status, created_at, started_at,
        quizzes (title),
        player_sessions (count)
      `)
      .eq('host_id', userId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get active games error:', error);
      return res.status(500).json({ error: 'Failed to fetch active games' });
    }

    const formattedGames = activeGames.map(game => ({
      id: game.id,
      gamePin: game.game_pin,
      quizTitle: game.quizzes?.title,
      status: game.status,
      playersCount: game.player_sessions[0]?.count || 0,
      createdAt: game.created_at,
      startedAt: game.started_at
    }));

    res.json({
      activeGames: formattedGames
    });
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Failed to fetch active games' });
  }
};