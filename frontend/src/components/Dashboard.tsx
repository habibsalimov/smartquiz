import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import HostDashboard from './game/HostDashboard';
import PlayerGame from './game/PlayerGame';

const Dashboard: React.FC = () => {
  const { connected } = useSocket();
  const { user } = useAuth();
  const [gamePin, setGamePin] = useState('');
  const [nickname, setNickname] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [currentView, setCurrentView] = useState<'dashboard' | 'host' | 'player'>('dashboard');

  useEffect(() => {
    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
  }, []);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gamePin && nickname) {
      setCurrentView('player');
    }
  };

  const handleHostGame = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setCurrentView('host');
  };

  const StatusIndicator = ({ status, label }: { status: string; label: string }) => {
    const colors = {
      checking: 'bg-yellow-500',
      online: 'bg-green-500',
      offline: 'bg-red-500',
      connected: 'bg-green-500',
      disconnected: 'bg-red-500'
    };

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors]}`}></div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    );
  };

  const dashboardContent = (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Game */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Oyuna Katıl</h2>
            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
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
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Takma Adın"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg text-xl"
                  maxLength={20}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!connected || !gamePin || !nickname}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
              >
                {connected ? 'Oyuna Katıl' : 'Bağlanıyor...'}
              </button>
            </form>
          </div>

          {/* Host Game */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Oyun Yönet</h2>
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Kendi quiz oyunlarını oluştur ve yönet
              </p>
              {!user ? (
                <div className="text-center space-y-4">
                  <p className="text-orange-600 font-medium">Oyun yönetmek için giriş gerekli</p>
                  <div className="space-y-2">
                    <a
                      href="/login"
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
                    >
                      Giriş Yap
                    </a>
                    <a
                      href="/register"
                      className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-200"
                    >
                      Hesap Oluştur
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <a
                    href="/create-quiz"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200 text-center"
                  >
                    Quiz Oluştur
                  </a>
                  <a
                    href="/manage-quizzes"
                    className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200 text-center"
                  >
                    Quiz Yönet
                  </a>
                  <button 
                    onClick={handleHostGame}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
                  >
                    Oyunu Başlat
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities / Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Başlangıç</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🎮</div>
              <h3 className="font-semibold">Oyunlara Katıl</h3>
              <p className="text-sm text-gray-600">
                Diğerlerinin yönettiği quiz oyunlarına katılmak için 6 haneli PIN girin
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-semibold">Quiz Oluştur</h3>
              <p className="text-sm text-gray-600">
                Çoktan seçmeli sorularla kendi interaktif quizlerinizi tasarlayın
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold">Yarış</h3>
              <p className="text-sm text-gray-600">
                Diğerleriyle gerçek zamanlı yarışın ve lider tablosunda yükselin
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  // Render different views based on current state
  if (currentView === 'host') {
    return <HostDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'player') {
    return <PlayerGame 
      onBack={() => setCurrentView('dashboard')} 
      initialGamePin={gamePin}
      initialNickname={nickname}
    />;
  }

  return dashboardContent;
};

export default Dashboard;