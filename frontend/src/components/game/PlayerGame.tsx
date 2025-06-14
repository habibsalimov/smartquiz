import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  points: number;
  answer_options: AnswerOption[];
}

interface AnswerOption {
  id: string;
  option_text: string;
  color: string;
}

interface PlayerGameProps {
  onBack: () => void;
  initialGamePin?: string;
  initialNickname?: string;
}

const PlayerGame: React.FC<PlayerGameProps> = ({ onBack, initialGamePin = '', initialNickname = '' }) => {
  const { socket, connected } = useSocket();
  const [gamePin, setGamePin] = useState(initialGamePin);
  const [nickname, setNickname] = useState(initialNickname);
  const [gameStatus, setGameStatus] = useState<'joining' | 'waiting' | 'playing' | 'answered' | 'results' | 'waiting-next' | 'ended'>('joining');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [answerResult, setAnswerResult] = useState<{correct: boolean, points: number} | null>(null);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Auto-join effect when props are provided (only once)
  useEffect(() => {
    if (initialGamePin && initialNickname && socket && connected && gameStatus === 'joining' && !hasAttemptedJoin && !isJoining) {
      // Automatically join the game if we have the data from Dashboard
      setHasAttemptedJoin(true);
      joinGame({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [initialGamePin, initialNickname, socket, connected, gameStatus, hasAttemptedJoin, isJoining]);

  useEffect(() => {
    if (!socket) return;

    socket.on('join-success', (data) => {
      console.log('Join success:', data);
      setGameStatus('waiting');
      // Store player session info
      setPlayerId(data.playerId || '');
      setIsJoining(false); // Reset joining state on success
    });

    socket.on('join-error', (data) => {
      console.log('Join error:', data);
      setError(data.message);
      setHasAttemptedJoin(false); // Allow retry on socket error
      setIsJoining(false); // Reset joining state on error
    });

    socket.on('game-started', (data) => {
      console.log('Game started:', data);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.question.time_limit);
      setGameStatus('playing');
      setSelectedAnswer(null);
      setAnswerResult(null);
    });

    socket.on('next-question', (data) => {
      console.log('Next question:', data);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTimeLeft(data.question.time_limit);
      setGameStatus('playing');
      setSelectedAnswer(null);
      setAnswerResult(null);
    });

    socket.on('answer-result', (data) => {
      console.log('Answer result:', data);
      setAnswerResult({ correct: data.correct, points: data.points });
      setScore(prev => prev + data.points);
      setGameStatus('answered');
      
      // Auto-transition to waiting state after showing result
      setTimeout(() => {
        setGameStatus('waiting-next');
      }, 2000); // Show result for 2 seconds, then show waiting
    });

    socket.on('question-results', (data) => {
      console.log('Question results:', data);
      setGameStatus('results');
    });

    socket.on('game-ended', (data) => {
      console.log('Game ended:', data);
      setGameStatus('ended');
    });

    socket.on('answer-error', (data) => {
      console.log('Answer error:', data);
      setError(data.message);
    });

    return () => {
      socket.off('join-success');
      socket.off('join-error');
      socket.off('game-started');
      socket.off('next-question');
      socket.off('answer-result');
      socket.off('question-results');
      socket.off('game-ended');
      socket.off('answer-error');
    };
  }, [socket]);

  // Timer effect
  useEffect(() => {
    if (gameStatus === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameStatus === 'playing' && timeLeft === 0 && !selectedAnswer) {
      // Auto submit when time runs out
      setGameStatus('answered');
    }
  }, [gameStatus, timeLeft, selectedAnswer]);

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !connected) {
      setError('Sunucuya bağlı değil');
      return;
    }

    // Prevent multiple simultaneous join attempts
    if (isJoining) {
      console.log('Join already in progress, ignoring duplicate attempt');
      return;
    }

    if (hasAttemptedJoin && gameStatus === 'joining') {
      console.log('Join already attempted, ignoring duplicate attempt');
      return;
    }

    setError('');
    setHasAttemptedJoin(true);
    setIsJoining(true);

    // First make API call to join game
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/game/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gamePin,
          nickname,
          userId: null // Anonymous for now
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerId(data.playerSession.id);
        
        // Join socket room and notify others
        socket.emit('join-game', {
          gamePin,
          nickname,
          userId: null
        });
        
        // Notify room about new player (after API join)
        socket.emit('notify-player-joined', {
          gamePin,
          players: data.gameInfo.players || []
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Oyuna katılım başarısız');
        setHasAttemptedJoin(false); // Allow retry on error
        setIsJoining(false);
      }
    } catch (error) {
      console.error('Join game error:', error);
      setError('Oyuna katılım başarısız');
      setHasAttemptedJoin(false); // Allow retry on error
      setIsJoining(false);
    }
  };

  const submitAnswer = (optionId: string) => {
    if (selectedAnswer || gameStatus !== 'playing') return;

    setSelectedAnswer(optionId);
    const answerTime = currentQuestion!.time_limit - timeLeft;

    socket?.emit('submit-answer', {
      answerId: optionId,
      questionId: currentQuestion!.id,
      answerTime: answerTime,
      playerId: playerId
    });
  };

  const getOptionColors = () => ({
    red: 'bg-red-500 hover:bg-red-600',
    blue: 'bg-blue-500 hover:bg-blue-600', 
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    green: 'bg-green-500 hover:bg-green-600'
  });

  const getOptionShapes = () => ['▲', '◆', '●', '■'];

  if (gameStatus === 'joining') {
    // If we have initial data, show connecting status instead of form
    if (initialGamePin && initialNickname) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl text-center">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Geri
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Oyuna Katılıyor...</h1>
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-gray-600 mb-2">Oyun Kodu: {initialGamePin}</p>
            <p className="text-gray-600 mb-4">Takma Ad: {initialNickname}</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Geri
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Oyuna Katıl</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={joinGame} className="space-y-4">
            <input
              type="text"
              placeholder="Oyun Kodu"
              value={gamePin}
              onChange={(e) => setGamePin(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-xl text-center font-mono"
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
            <input
              type="text"
              placeholder="Takma Adın"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-xl"
              maxLength={20}
              required
            />
            <button
              type="submit"
              disabled={!connected || !gamePin || !nickname}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
            >
              {connected ? 'Oyuna Katıl' : 'Bağlanıyor...'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Hoş geldin, {nickname}!</h1>
          <div className="text-6xl mb-4">🎮</div>
          <p className="text-xl mb-2">Oyun Kodu: {gamePin}</p>
          <p className="text-lg">Ev sahibinin oyunu başlatması bekleniyor...</p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'playing' && currentQuestion) {
    const colors = getOptionColors();
    const shapes = getOptionShapes();

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg">Soru {questionNumber}/{totalQuestions}</div>
              <div className="text-lg">Puan: {score}</div>
            </div>
            <div className={`text-6xl font-bold mb-2 ${timeLeft <= 5 ? 'text-red-500' : ''}`}>
              {timeLeft}
            </div>
            <h2 className="text-2xl font-bold mb-6">{currentQuestion.question_text}</h2>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.answer_options.map((option, index) => {
              const colorClass = colors[option.color as keyof typeof colors] || 'bg-gray-500';
              const isSelected = selectedAnswer === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => submitAnswer(option.id)}
                  disabled={selectedAnswer !== null}
                  className={`${colorClass} ${
                    isSelected ? 'ring-4 ring-white scale-105' : ''
                  } ${
                    selectedAnswer ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                  } p-8 rounded-lg flex items-center justify-center text-white transition-all duration-200 transform`}
                >
                  <span className="text-4xl mr-4">{shapes[index]}</span>
                  <span className="text-xl font-semibold text-center">
                    {option.option_text}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <div className="text-center mt-6">
              <p className="text-xl">Cevap gönderildi! Sonuçlar bekleniyor...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameStatus === 'answered' && answerResult) {
    return (
      <div className={`min-h-screen ${answerResult.correct ? 'bg-green-500' : 'bg-red-500'} flex flex-col items-center justify-center text-white`}>
        <div className="text-center">
          <div className="text-8xl mb-4">{answerResult.correct ? '✓' : '✗'}</div>
          <h1 className="text-4xl font-bold mb-2">
            {answerResult.correct ? 'Doğru!' : 'Yanlış!'}
          </h1>
          <p className="text-2xl mb-4">+{answerResult.points} puan</p>
          <p className="text-xl">Toplam Puan: {score}</p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-purple-600 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Soru Sonuçları</h1>
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl mb-2">Puanınız: {score}</p>
          <p className="text-lg">Sonraki soru bekleniyor...</p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting-next') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-600 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Sonraki Soru Bekleniyor...</h1>
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl mb-2">Mevcut Puan: {score}</p>
          <p className="text-lg mb-4">Soru {questionNumber}/{totalQuestions}</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-500 to-orange-600 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Oyun Bitti!</h1>
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-3xl font-bold mb-4">Son Puan: {score}</p>
          <p className="text-xl mb-6">Oynadığınız için teşekkürler, {nickname}!</p>
          <button
            onClick={() => {
              setGameStatus('joining');
              setGamePin('');
              setNickname('');
              setScore(0);
              setError('');
              setCurrentQuestion(null);
              setAnswerResult(null);
              setHasAttemptedJoin(false); // Reset join attempt flag
              setIsJoining(false); // Reset joining state
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Tekrar Oyna
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PlayerGame;