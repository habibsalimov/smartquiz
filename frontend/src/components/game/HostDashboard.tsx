import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useLocation } from 'react-router-dom';

interface Quiz {
  id: string;
  title: string;
  description: string;
  question_count: number;
}

interface Player {
  id: string;
  nickname: string;
  score: number;
}

interface HostDashboardProps {
  onBack: () => void;
}

const HostDashboard: React.FC<HostDashboardProps> = ({ onBack }) => {
  const { socket } = useSocket();
  const location = useLocation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [gamePin, setGamePin] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'selecting' | 'waiting' | 'active' | 'ended'>('selecting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastScoreUpdate, setLastScoreUpdate] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  useEffect(() => {
    fetchUserQuizzes();
  }, []);

  // Auto-select quiz if selectedQuizId is passed via state
  useEffect(() => {
    const state = location.state as { selectedQuizId?: string };
    if (state?.selectedQuizId && quizzes.length > 0) {
      const targetQuiz = quizzes.find(quiz => quiz.id === state.selectedQuizId);
      if (targetQuiz) {
        createGameSession(targetQuiz);
      }
    }
  }, [quizzes, location.state]);

  useEffect(() => {
    if (!socket) return;

    socket.on('players-update', (data) => {
      console.log('Players update:', data);
      setPlayers(data.players || []);
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      setPlayers(data.players || []);
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data);
      setPlayers(prev => prev.filter(p => p.nickname !== data.nickname));
    });

    socket.on('game-started', (data) => {
      console.log('Game started:', data);
      setGameStatus('active');
      setCurrentQuestion(data.questionNumber || 1);
      setTotalQuestions(data.totalQuestions || 0);
    });

    socket.on('next-question', (data) => {
      console.log('Next question:', data);
      setCurrentQuestion(data.questionNumber || 1);
      setTotalQuestions(data.totalQuestions || 0);
    });

    socket.on('score-updated', (data) => {
      console.log('Score updated:', data);
      setPlayers(data.players || []);
      setLastScoreUpdate(Date.now());
    });

    socket.on('game-ended', (data) => {
      console.log('Game ended:', data);
      setGameStatus('ended');
      // Update final scores
      if (data.finalScores) {
        setPlayers(data.finalScores);
      }
    });

    return () => {
      socket.off('players-update');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('score-updated');
      socket.off('game-started');
      socket.off('next-question');
      socket.off('game-ended');
    };
  }, [socket]);

  const fetchUserQuizzes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Oyun yönetmek için giriş yapın');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz?my_quizzes=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      } else {
        setError('Quizleriniz yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError('Quizler yüklenemedi');
    }
  };

  const createGameSession = async (quiz: Quiz) => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quizId: quiz.id })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedQuiz(quiz);
        setGamePin(data.gameSession.gamePin);
        setGameStatus('waiting');
        
        // Join socket room as host to receive player updates
        if (socket) {
          socket.emit('host-join-room', { 
            gamePin: data.gameSession.gamePin,
            isHost: true 
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Oyun oturumu oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating game session:', error);
      setError('Oyun oturumu oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/game/start/${gamePin}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Emit socket event to start the game
        socket?.emit('start-game', { gamePin });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Oyun başlatılamadı');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Oyun başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (socket && gamePin) {
      console.log('Host manually advancing to next question');
      socket.emit('next-question', { gamePin });
    }
  };

  const endGame = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/game/end/${gamePin}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setGameStatus('ended');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  if (gameStatus === 'selecting') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Oyun Yönet</h1>
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Geri
              </button>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Yönetilecek Quiz'i Seçin</h2>
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Henüz hiç quiz oluşturmadınız.</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => window.location.href = '/create-quiz'}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                    >
                      İlk Quiz'inizi Oluşturun
                    </button>
                    <button
                      onClick={() => window.location.href = '/manage-quizzes'}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Quiz Yönetimi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => createGameSession(quiz)}
                    >
                      <h3 className="font-semibold text-lg">{quiz.title}</h3>
                      <p className="text-gray-600 mb-2">{quiz.description}</p>
                      <p className="text-sm text-gray-500">
                        {quiz.question_count} soru
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex flex-col items-center justify-center text-white">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4">Oyun Kodu</h1>
          <div className="text-8xl font-mono font-bold bg-white text-purple-600 px-8 py-4 rounded-lg shadow-lg">
            {gamePin}
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 max-w-2xl w-full">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            {selectedQuiz?.title}
          </h2>
          <h3 className="text-xl mb-4">Oyuncular ({players.length})</h3>
          
          {players.length === 0 ? (
            <p className="text-center text-lg opacity-75 mb-6">
              Oyuncuların katılması bekleniyor...
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6 max-h-60 overflow-y-auto">
              {players.map((player) => (
                <div key={player.id} className="bg-white/30 rounded p-3 text-center">
                  {player.nickname}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={startGame}
              disabled={players.length === 0 || loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
            >
              {loading ? 'Başlatılıyor...' : `Oyunu Başlat (${players.length} oyuncu)`}
            </button>
            <button
              onClick={() => setGameStatus('selecting')}
              className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition duration-200"
            >
              İptal
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500 text-white px-4 py-2 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameStatus === 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-blue-600 flex flex-col items-center justify-center text-white p-4">
        <div className="text-center max-w-4xl w-full">
          <h1 className="text-4xl font-bold mb-2">Oyun Devam Ediyor</h1>
          <div className="mb-6">
            <p className="text-xl mb-2">Soru {currentQuestion}/{totalQuestions}</p>
            <p className="text-lg opacity-75">Oyuncular soruları yanıtlıyor...</p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Canlı Lider Tablosu</h3>
              {Date.now() - lastScoreUpdate < 2000 && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  GÜNCELLENDİ
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`flex justify-between items-center p-2 rounded ${
                      index === 0 ? 'bg-yellow-400/30' : 'bg-white/10'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">
                        {index === 0 ? '🏆' : `#${index + 1}`}
                      </span>
                      {player.nickname}
                    </span>
                    <span className="font-bold">{player.score} puan</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={nextQuestion}
              disabled={currentQuestion >= totalQuestions}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              Sonraki Soru
            </button>
            <button
              onClick={endGame}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              Oyunu Bitir
            </button>
          </div>
          
          <p className="text-sm opacity-75 mt-4">
            Not: Oyun otomatik olarak ilerliyor. "Sonraki Soru" butonu manuel kontrol içindir.
          </p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-500 to-orange-600 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Oyun Bitti!</h1>
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 max-w-2xl">
            <h2 className="text-2xl font-semibold mb-6">Son Sonuçlar</h2>
            <div className="space-y-4">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-400/50' : 'bg-white/30'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl font-bold mr-4">#{index + 1}</span>
                      <span className="text-xl">{player.nickname}</span>
                    </div>
                    <span className="text-2xl font-bold">{player.score}</span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => {
                setGameStatus('selecting');
                setSelectedQuiz(null);
                setGamePin('');
                setPlayers([]);
                setError('');
              }}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              Başka Oyun Yönet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default HostDashboard;