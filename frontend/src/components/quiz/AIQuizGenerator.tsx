import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AIQuizGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (quiz: any) => void;
}

interface AIQuizRequest {
  topic: string;
  difficulty: 'kolay' | 'orta' | 'zor';
  category: string;
  questionCount: number;
}

const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({ 
  isOpen, 
  onClose, 
  onQuizGenerated 
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  
  const [formData, setFormData] = useState<AIQuizRequest>({
    topic: '',
    difficulty: 'orta',
    category: '',
    questionCount: 10
  });

  // Check AI service status when component mounts
  useEffect(() => {
    if (isOpen) {
      checkAIStatus();
    }
  }, [isOpen]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz/ai-status`);
      const data = await response.json();
      
      if (response.ok && data.status === 'available') {
        setAiStatus('available');
      } else {
        setAiStatus('unavailable');
        setError(data.message || 'AI servisi kullanılamıyor');
      }
    } catch (error) {
      setAiStatus('unavailable');
      setError('AI servis durumu kontrol edilemedi');
    }
  };

  const generateQuiz = async () => {
    if (!formData.topic.trim()) {
      setError('Lütfen bir konu girin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz/generate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onQuizGenerated(data.quiz);
        onClose();
        // Reset form
        setFormData({
          topic: '',
          difficulty: 'orta',
          category: '',
          questionCount: 10
        });
      } else {
        setError(data.error || 'Quiz oluşturulamadı');
      }
    } catch (error) {
      console.error('AI Quiz generation error:', error);
      setError('Ağ hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              🤖 AI ile Quiz Oluştur
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* AI Status Check */}
          {aiStatus === 'checking' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-gray-600">AI servisi kontrol ediliyor...</p>
            </div>
          )}

          {aiStatus === 'unavailable' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h4 className="font-bold">AI Servisi Kullanılamıyor</h4>
              <p className="text-sm mt-1">
                GEMINI_API_KEY environment variable'ı konfigüre edilmemiş. 
                Lütfen sistem yöneticisine başvurun.
              </p>
            </div>
          )}

          {aiStatus === 'available' && (
            <>
              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Konusu *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Örn: Türk Tarihi, Matematik, Coğrafya..."
                    maxLength={100}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    AI bu konuda sorular oluşturacak
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zorluk Seviyesi
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      difficulty: e.target.value as 'kolay' | 'orta' | 'zor' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="kolay">🟢 Kolay (Temel Seviye)</option>
                    <option value="orta">🟡 Orta (Lise Seviyesi)</option>
                    <option value="zor">🔴 Zor (Üniversite Seviyesi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Örn: Tarih, Fen, Spor..."
                    maxLength={50}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Soru Sayısı
                  </label>
                  <select
                    value={formData.questionCount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      questionCount: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value={5}>5 Soru</option>
                    <option value={10}>10 Soru (Önerilen)</option>
                    <option value={15}>15 Soru</option>
                  </select>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-800 mb-2">
                  🧠 AI Quiz Özellikler
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Çoktan seçmeli sorular (4 seçenek)</li>
                  <li>• Türkçe dil desteği</li>
                  <li>• Konu odaklı sorular</li>
                  <li>• Düzenlenebilir sonuçlar</li>
                  <li>• Gemini 2.5 Flash ile oluşturulan</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={generateQuiz}
                  disabled={loading || !formData.topic.trim()}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    '🚀 Quiz Oluştur'
                  )}
                </button>
              </div>

              {loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-yellow-800">
                    ⏳ AI quiz oluşturuyor... Bu işlem 10-30 saniye sürebilir.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuizGenerator;