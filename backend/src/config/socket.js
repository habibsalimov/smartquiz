import { supabaseAdmin } from './supabase.js';

// Game state management for auto-progression
const gameStates = new Map(); // gamePin -> { players: Set, currentQuestionId: string, timer: timeout, questionStartTime: number }

export const handleSocketConnection = (io, socket) => {
  console.log('New client connected:', socket.id);

  // Host joins room
  socket.on('host-join-room', async (data) => {
    const { gamePin, isHost } = data;
    console.log('Host joining room:', { gamePin, isHost });
    
    try {
      // Find game session
      const { data: gameSession } = await supabaseAdmin
        .from('game_sessions')
        .select('id, status')
        .eq('game_pin', gamePin)
        .single();

      if (!gameSession) {
        socket.emit('join-error', { message: 'Game not found' });
        return;
      }

      // Join socket room
      socket.join(gamePin);
      socket.gamePin = gamePin;
      socket.isHost = isHost;
      
      // Get current player list and send to host
      const { data: players } = await supabaseAdmin
        .from('player_sessions')
        .select('id, nickname, score')
        .eq('game_session_id', gameSession.id)
        .order('joined_at', { ascending: true });
      
      // Send current players to host
      socket.emit('players-update', {
        players: players || [],
        playerCount: players?.length || 0
      });

      console.log(`Host joined room ${gamePin}, current players:`, players?.length || 0);
      
    } catch (error) {
      console.error('Host join room error:', error);
      socket.emit('join-error', { message: 'Failed to join room' });
    }
  });

  // Join game room
  socket.on('join-game', async (data) => {
    const { gamePin, nickname, userId } = data;
    console.log('Join game request:', { gamePin, nickname, userId });
    
    try {
      // Find game session
      const { data: gameSession } = await supabaseAdmin
        .from('game_sessions')
        .select('id, status')
        .eq('game_pin', gamePin)
        .single();

      if (!gameSession) {
        socket.emit('join-error', { message: 'Game not found' });
        return;
      }

      if (gameSession.status !== 'waiting') {
        socket.emit('join-error', { message: 'Game already started or ended' });
        return;
      }

      // Join socket room
      socket.join(gamePin);
      socket.gamePin = gamePin;
      socket.nickname = nickname;
      
      // Check if player already exists (joined via API)
      const { data: existingPlayer } = await supabaseAdmin
        .from('player_sessions')
        .select('id')
        .eq('game_session_id', gameSession.id)
        .eq('nickname', nickname)
        .single();

      if (existingPlayer) {
        // Player already exists, just send success without triggering duplicate events
        socket.emit('join-success', {
          gamePin: gamePin,
          gameId: gameSession.id,
          playerId: existingPlayer.id
        });
        console.log(`Player ${nickname} joined socket room for existing session`);
        return;
      }
      
      // If player doesn't exist, this is a socket-only join (shouldn't happen with current flow)
      // But we handle it for completeness
      console.log('Warning: Socket join without prior API call for', nickname);
      
      socket.emit('join-success', {
        gamePin: gamePin,
        gameId: gameSession.id
      });
    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('join-error', { message: 'Failed to join game' });
    }
  });

  // Notify room about new player (from API join)
  socket.on('notify-player-joined', async (data) => {
    const { gamePin, players } = data;
    console.log('Notifying room about new player in', gamePin);
    
    // Broadcast to all room members (including host)
    io.to(gamePin).emit('player-joined', {
      players: players || [],
      playerCount: players?.length || 0
    });
  });

  // Host starts game
  socket.on('start-game', async (data) => {
    const { gamePin } = data;
    console.log('Start game request:', { gamePin });
    
    try {
      // Get first question
      const { data: gameSession } = await supabaseAdmin
        .from('game_sessions')
        .select(`
          id,
          quizzes (
            questions (
              id, question_text, time_limit, points, order_index,
              answer_options (id, option_text, color)
            )
          )
        `)
        .eq('game_pin', gamePin)
        .single();

      if (!gameSession) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const questions = gameSession.quizzes?.questions || [];
      questions.sort((a, b) => a.order_index - b.order_index);
      
      const firstQuestion = questions[0];
      
      if (!firstQuestion) {
        socket.emit('error', { message: 'No questions found in quiz' });
        return;
      }

      // Remove correct answers from client data
      const questionForClient = {
        ...firstQuestion,
        answer_options: firstQuestion.answer_options.map(opt => ({
          id: opt.id,
          option_text: opt.option_text,
          color: opt.color
        }))
      };

      // Initialize game state for auto-progression
      const { data: players } = await supabaseAdmin
        .from('player_sessions')
        .select('id')
        .eq('game_session_id', gameSession.id);

      const playerIds = new Set(players?.map(p => p.id) || []);
      
      // Initialize game state
      gameStates.set(gamePin, {
        players: playerIds,
        answeredPlayers: new Set(),
        currentQuestionId: firstQuestion.id,
        currentQuestionIndex: 0,
        totalQuestions: questions.length,
        questionStartTime: Date.now(),
        gameSessionId: gameSession.id
      });

      io.to(gamePin).emit('game-started', {
        question: questionForClient,
        questionNumber: 1,
        totalQuestions: questions.length
      });

      // Start question timer for auto-progression
      startQuestionTimer(io, gamePin, firstQuestion.time_limit);
    } catch (error) {
      console.error('Start game error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // Submit answer
  socket.on('submit-answer', async (data) => {
    const { answerId, questionId, answerTime, playerId } = data;
    console.log('Answer submitted:', { answerId, questionId, answerTime, playerId });
    
    try {
      // Get correct answer
      const { data: answerOption } = await supabaseAdmin
        .from('answer_options')
        .select('is_correct')
        .eq('id', answerId)
        .single();

      if (!answerOption) {
        socket.emit('answer-error', { message: 'Invalid answer' });
        return;
      }

      // Calculate points (faster answers get more points)
      const maxPoints = 1000;
      const timeBonus = Math.max(0, 1 - (answerTime / 30));
      const points = answerOption.is_correct ? Math.round(maxPoints * timeBonus) : 0;

      // Save answer
      const { error: answerError } = await supabaseAdmin
        .from('player_answers')
        .insert({
          player_session_id: playerId,
          question_id: questionId,
          answer_option_id: answerId,
          answer_time: answerTime,
          points_earned: points
        });

      if (answerError) {
        console.error('Answer save error:', answerError);
      }

      // Update player score
      if (points > 0) {
        await supabaseAdmin.rpc('increment_player_score', {
          player_id: playerId,
          points_to_add: points
        });
      }

      // Get player session and game info
      const { data: playerSession } = await supabaseAdmin
        .from('player_sessions')
        .select(`
          game_session_id,
          game_sessions!inner(game_pin)
        `)
        .eq('id', playerId)
        .single();

      if (playerSession && playerSession.game_sessions) {
        const gamePin = playerSession.game_sessions.game_pin;
        
        // Get updated player scores for the room
        const { data: updatedPlayers } = await supabaseAdmin
          .from('player_sessions')
          .select('id, nickname, score')
          .eq('game_session_id', playerSession.game_session_id)
          .order('score', { ascending: false });

        // Broadcast score update to entire room (including host)
        io.to(gamePin).emit('score-updated', {
          players: updatedPlayers || [],
          updatedPlayer: { 
            id: playerId, 
            points: points,
            correct: answerOption.is_correct 
          }
        });

        console.log(`Score updated for player ${playerId}, broadcasted to room ${gamePin}`);
      }

      socket.emit('answer-result', {
        correct: answerOption.is_correct,
        points: points,
        correctAnswer: answerId
      });

      // Check if we should auto-progress to next question
      if (playerSession && playerSession.game_sessions) {
        const gamePin = playerSession.game_sessions.game_pin;
        await checkAndProgressGame(io, gamePin, questionId, playerSession.game_session_id);
      }

    } catch (error) {
      console.error('Submit answer error:', error);
      socket.emit('answer-error', { message: 'Failed to submit answer' });
    }
  });

  // Manual next question (host override)
  socket.on('next-question', async (data) => {
    const { gamePin } = data;
    console.log('Manual next question request from host:', { gamePin });
    
    // Allow host to manually progress to next question
    await progressToNextQuestion(io, gamePin);
  });

  // Show question results
  socket.on('show-results', async (data) => {
    const { gamePin, questionId } = data;
    
    try {
      // Get current scores
      const { data: gameSession } = await supabaseAdmin
        .from('game_sessions')
        .select('id')
        .eq('game_pin', gamePin)
        .single();

      if (!gameSession) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const { data: scores } = await supabaseAdmin
        .from('player_sessions')
        .select('id, nickname, score')
        .eq('game_session_id', gameSession.id)
        .order('score', { ascending: false });

      // Get correct answer
      const { data: correctAnswer } = await supabaseAdmin
        .from('answer_options')
        .select('id, option_text')
        .eq('question_id', questionId)
        .eq('is_correct', true)
        .single();

      io.to(gamePin).emit('question-results', {
        scores: scores || [],
        correctAnswer: correctAnswer
      });

      // Also send score update to keep host dashboard in sync
      io.to(gamePin).emit('score-updated', {
        players: scores || []
      });

    } catch (error) {
      console.error('Show results error:', error);
      socket.emit('error', { message: 'Failed to show results' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.gamePin) {
      if (socket.isHost) {
        console.log('Host disconnected from room:', socket.gamePin);
        // Clean up game state when host disconnects
        const gameState = gameStates.get(socket.gamePin);
        if (gameState?.timer) {
          clearTimeout(gameState.timer);
        }
        gameStates.delete(socket.gamePin);
        console.log(`Cleaned up game state for ${socket.gamePin} due to host disconnect`);
      } else if (socket.nickname) {
        socket.to(socket.gamePin).emit('player-left', { 
          nickname: socket.nickname,
          message: `${socket.nickname} left the game`
        });
      }
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

// Helper function to start question timer for auto-progression
const startQuestionTimer = (io, gamePin, timeLimit) => {
  const gameState = gameStates.get(gamePin);
  if (!gameState) return;

  // Clear existing timer if any
  if (gameState.timer) {
    clearTimeout(gameState.timer);
  }

  // Add 2 seconds buffer for answer result display
  const timerDuration = (timeLimit + 2) * 1000;
  
  gameState.timer = setTimeout(async () => {
    console.log(`Question timer expired for game ${gamePin}, auto-progressing`);
    await progressToNextQuestion(io, gamePin);
  }, timerDuration);

  gameStates.set(gamePin, gameState);
};

// Helper function to check if all players have answered and progress if needed
const checkAndProgressGame = async (io, gamePin, questionId, gameSessionId) => {
  const gameState = gameStates.get(gamePin);
  if (!gameState || gameState.currentQuestionId !== questionId) {
    return; // Question has already progressed or game not found
  }

  // Get all players who have answered this specific question
  const { data: answers } = await supabaseAdmin
    .from('player_answers')
    .select('player_session_id')
    .eq('question_id', questionId);

  const answeredPlayerIds = new Set(answers?.map(a => a.player_session_id) || []);
  
  // Check if all active players have answered
  const allPlayersAnswered = gameState.players.size > 0 && 
    [...gameState.players].every(playerId => answeredPlayerIds.has(playerId));

  if (allPlayersAnswered) {
    console.log(`All players answered for game ${gamePin}, auto-progressing in 3 seconds`);
    
    // Clear the existing timer since we're progressing early
    if (gameState.timer) {
      clearTimeout(gameState.timer);
    }

    // Brief delay to show results, then progress
    gameState.timer = setTimeout(async () => {
      await progressToNextQuestion(io, gamePin);
    }, 3000); // 3 second delay for results display

    gameStates.set(gamePin, gameState);
  }
};

// Helper function to progress to the next question or end game
const progressToNextQuestion = async (io, gamePin) => {
  const gameState = gameStates.get(gamePin);
  if (!gameState) return;

  try {
    const nextIndex = gameState.currentQuestionIndex + 1;

    // Get game and questions
    const { data: gameSession } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id,
        quizzes (
          questions (
            id, question_text, time_limit, points, order_index,
            answer_options (id, option_text, color)
          )
        )
      `)
      .eq('game_pin', gamePin)
      .single();

    if (!gameSession) {
      console.error('Game session not found for auto-progression');
      return;
    }

    const questions = gameSession.quizzes?.questions || [];
    questions.sort((a, b) => a.order_index - b.order_index);

    if (nextIndex >= questions.length) {
      // Game ended - show final scores
      const { data: finalScores } = await supabaseAdmin
        .from('player_sessions')
        .select('id, nickname, score')
        .eq('game_session_id', gameSession.id)
        .order('score', { ascending: false });

      // Update game status
      await supabaseAdmin
        .from('game_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('game_pin', gamePin);

      io.to(gamePin).emit('game-ended', {
        finalScores: finalScores || []
      });

      // Clean up game state
      gameStates.delete(gamePin);
      console.log(`Game ${gamePin} completed and cleaned up`);
      return;
    }

    // Update current question index in database
    await supabaseAdmin
      .from('game_sessions')
      .update({ current_question_index: nextIndex })
      .eq('game_pin', gamePin);

    const nextQuestion = questions[nextIndex];
    
    // Remove correct answers from client data
    const questionForClient = {
      ...nextQuestion,
      answer_options: nextQuestion.answer_options.map(opt => ({
        id: opt.id,
        option_text: opt.option_text,
        color: opt.color
      }))
    };

    // Update game state for new question
    gameState.currentQuestionId = nextQuestion.id;
    gameState.currentQuestionIndex = nextIndex;
    gameState.answeredPlayers = new Set();
    gameState.questionStartTime = Date.now();
    gameStates.set(gamePin, gameState);

    // Emit next question
    io.to(gamePin).emit('next-question', {
      question: questionForClient,
      questionNumber: nextIndex + 1,
      totalQuestions: questions.length
    });

    // Start timer for new question
    startQuestionTimer(io, gamePin, nextQuestion.time_limit);

    console.log(`Auto-progressed to question ${nextIndex + 1} in game ${gamePin}`);

  } catch (error) {
    console.error('Auto-progression error:', error);
  }
};