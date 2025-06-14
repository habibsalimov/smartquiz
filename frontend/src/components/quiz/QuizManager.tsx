import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import QuizCard from './QuizCard';

interface Quiz {
  id: string;
  title: string;
  description: string;
  cover_image?: string;
  is_public: boolean;
  created_at: string;
  creator: string;
  question_count: number;
  is_owner: boolean;
}

const QuizManager: React.FC = () => {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'questions'>('date');
  const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all');

  const fetchUserQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz?my_quizzes=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Quizler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError('Ağ hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Wait for auth context to load before checking authentication
    if (authLoading) {
      return;
    }
    
    // Redirect if not authenticated after loading is complete
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchUserQuizzes();
  }, [user, authLoading, navigate, fetchUserQuizzes]);

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Quiz silinemedi');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError('Quiz silinirken hata oluştu');
    }
  };

  const handleEditQuiz = (quizId: string) => {
    navigate(`/edit-quiz/${quizId}`);
  };

  const handleHostQuiz = (quizId: string) => {
    navigate('/host', { state: { selectedQuizId: quizId } });
  };

  // Filter and sort quizzes
  const filteredQuizzes = quizzes
    .filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterPublic === 'all' ? true :
                           filterPublic === 'public' ? quiz.is_public :
                           !quiz.is_public;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'questions':
          return b.question_count - a.question_count;
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getQuizStats = () => {
    const total = quizzes.length;
    const publicQuizzes = quizzes.filter(q => q.is_public).length;
    const privateQuizzes = total - publicQuizzes;
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.question_count, 0);

    return { total, publicQuizzes, privateQuizzes, totalQuestions };
  };

  const stats = getQuizStats();

  // Show loading while auth context is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kimlik doğrulama kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (this should not render due to useEffect redirect)
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Quizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Quiz Yönetimi</h1>
              <p className="text-gray-600 mt-2">Oluşturduğunuz quizleri yönetin, düzenleyin veya silin</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/create-quiz')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center"
              >
                <span className="mr-2">+</span>
                Yeni Quiz Oluştur
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
              >
                ← Ana Sayfa
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-600">Toplam Quiz</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.publicQuizzes}</div>
              <div className="text-sm text-green-600">Herkese Açık</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.privateQuizzes}</div>
              <div className="text-sm text-orange-600">Özel</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.totalQuestions}</div>
              <div className="text-sm text-purple-600">Toplam Soru</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Ara
              </label>
              <input
                type="text"
                placeholder="Quiz başlığı veya açıklama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sıralama
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'questions')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">En Yeni</option>
                <option value="title">Alfabetik</option>
                <option value="questions">Soru Sayısı</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Görünürlük
              </label>
              <select
                value={filterPublic}
                onChange={(e) => setFilterPublic(e.target.value as 'all' | 'public' | 'private')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tümü</option>
                <option value="public">Herkese Açık</option>
                <option value="private">Özel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Quiz List */}
        {filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm || filterPublic !== 'all' ? 'Arama kriterlerinize uygun quiz bulunamadı' : 'Henüz quiz oluşturmadınız'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterPublic !== 'all' 
                ? 'Farklı arama terimleri deneyin veya filtreleri temizleyin'
                : 'İlk quiz\'inizi oluşturarak başlayın'
              }
            </p>
            <button
              onClick={() => navigate('/create-quiz')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              İlk Quiz'inizi Oluşturun
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onEdit={() => handleEditQuiz(quiz.id)}
                onDelete={() => setDeleteConfirm(quiz.id)}
                onHost={() => handleHostQuiz(quiz.id)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Quiz'i Sil
              </h3>
              <p className="text-gray-600 mb-6">
                Bu quiz'i silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg transition duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteQuiz(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-200"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizManager;