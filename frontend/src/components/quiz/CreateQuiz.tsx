import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import QuestionEditor from './QuestionEditor';
import AIQuizGenerator from './AIQuizGenerator';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  time_limit: number;
  points: number;
  order_index: number;
  media_url?: string;
  media_type?: 'image' | 'video';
  answer_options: AnswerOption[];
}

interface AnswerOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  color: string;
}

interface QuizData {
  title: string;
  description: string;
  cover_image?: string;
  is_public: boolean;
  questions: Question[];
}

const CreateQuiz: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const [quizData, setQuizData] = useState<QuizData>({
    title: '',
    description: '',
    cover_image: '',
    is_public: true,
    questions: []
  });

  // Redirect if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      time_limit: 30,
      points: 1000,
      order_index: quizData.questions.length,
      answer_options: [
        { id: `a_${Date.now()}_1`, option_text: '', is_correct: true, color: 'red' },
        { id: `a_${Date.now()}_2`, option_text: '', is_correct: false, color: 'blue' },
        { id: `a_${Date.now()}_3`, option_text: '', is_correct: false, color: 'yellow' },
        { id: `a_${Date.now()}_4`, option_text: '', is_correct: false, color: 'green' }
      ]
    };

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId: string, updatedQuestion: Question) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? updatedQuestion : q
      )
    }));
  };

  const removeQuestion = (questionId: string) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
        .map((q, index) => ({ ...q, order_index: index }))
    }));
  };

  const handleAIQuizGenerated = (aiQuiz: any) => {
    setQuizData(prev => ({
      ...prev,
      title: prev.title || aiQuiz.title,
      description: prev.description || aiQuiz.description,
      questions: aiQuiz.questions
    }));
    
    // Move to questions step
    setCurrentStep(2);
    setError('');
  };

  const validateQuiz = (): string[] => {
    const errors: string[] = [];

    if (!quizData.title.trim()) {
      errors.push('Quiz başlığı gerekli');
    }

    if (quizData.questions.length === 0) {
      errors.push('En az bir soru gerekli');
    }

    quizData.questions.forEach((question, index) => {
      if (!question.question_text.trim()) {
        errors.push(`Soru ${index + 1}: Soru metni gerekli`);
      }

      const hasCorrectAnswer = question.answer_options.some(option => option.is_correct);
      if (!hasCorrectAnswer) {
        errors.push(`Soru ${index + 1}: En az bir doğru cevap gerekli`);
      }

      const emptyOptions = question.answer_options.filter(option => !option.option_text.trim());
      if (emptyOptions.length > 0) {
        errors.push(`Soru ${index + 1}: Tüm cevap seçenekleri doldurulmalı`);
      }
    });

    return errors;
  };

  const saveQuiz = async () => {
    const validationErrors = validateQuiz();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare quiz data for API
      const apiQuizData = {
        title: quizData.title,
        description: quizData.description,
        cover_image: quizData.cover_image || undefined,
        is_public: quizData.is_public,
        questions: quizData.questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          time_limit: q.time_limit,
          points: q.points,
          order_index: q.order_index,
          media_url: q.media_url || undefined,
          media_type: q.media_type || undefined,
          answer_options: q.answer_options.map(a => ({
            option_text: a.option_text,
            is_correct: a.is_correct,
            color: a.color
          }))
        }))
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiQuizData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Quiz created successfully:', result);
        navigate('/', { state: { message: 'Quiz başarıyla oluşturuldu!' } });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Quiz oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError('Ağ hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Quiz Bilgileri</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Başlığı *
              </label>
              <input
                type="text"
                value={quizData.title}
                onChange={(e) => setQuizData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Quiz başlığı girin"
                maxLength={255}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={quizData.description}
                onChange={(e) => setQuizData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Quizinizi açıklayın"
                rows={4}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kapak Resmi URL'si (İsteğe Bağlı)
              </label>
              <input
                type="url"
                value={quizData.cover_image}
                onChange={(e) => setQuizData(prev => ({ ...prev, cover_image: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://ornek.com/resim.jpg"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={quizData.is_public}
                onChange={(e) => setQuizData(prev => ({ ...prev, is_public: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
                Bu quiz'i herkese açık yap (diğerleri görebilir ve oynayabilir)
              </label>
            </div>

            {/* AI Quiz Generation Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-purple-800 mb-2">
                    🤖 AI ile Hızlı Quiz Oluştur
                  </h3>
                  <p className="text-purple-600 text-sm mb-3">
                    Yapay zeka ile saniyeler içinde 10 soruluk quiz oluşturun. 
                    Daha sonra soruları düzenleyebilirsiniz.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-purple-600">
                    <span className="bg-purple-100 px-2 py-1 rounded">✨ Gemini 2.5 Flash</span>
                    <span className="bg-purple-100 px-2 py-1 rounded">⚡ Hızlı Oluşturma</span>
                    <span className="bg-purple-100 px-2 py-1 rounded">🎯 Konu Odaklı</span>
                    <span className="bg-purple-100 px-2 py-1 rounded">✏️ Düzenlenebilir</span>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAIGenerator(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg"
                  >
                    🚀 AI ile Oluştur
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sorular ({quizData.questions.length})</h2>
              <button
                onClick={addQuestion}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                + Soru Ekle
              </button>
            </div>

            {quizData.questions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">Henüz soru yok. İlk sorunuzu ekleyin!</p>
                <button
                  onClick={addQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                >
                  İlk Soruyu Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {quizData.questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    questionNumber={index + 1}
                    onUpdate={(updatedQuestion) => updateQuestion(question.id, updatedQuestion)}
                    onRemove={() => removeQuestion(question.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">İncele ve Yayınla</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{quizData.title}</h3>
              {quizData.description && (
                <p className="text-gray-600 mb-4">{quizData.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Soru Sayısı:</span> {quizData.questions.length}
                </div>
                <div>
                  <span className="font-medium">Görünürlük:</span> {quizData.is_public ? 'Herkese Açık' : 'Özel'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Soru Önizlemesi:</h4>
              {quizData.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium">Soru {index + 1}</h5>
                    <div className="text-sm text-gray-500">
                      {question.time_limit}s • {question.points} puan
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{question.question_text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {question.answer_options.map((option, optIndex) => (
                      <div
                        key={option.id}
                        className={`p-2 rounded text-sm ${
                          option.is_correct 
                            ? 'bg-green-100 border-2 border-green-500 text-green-800' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {option.option_text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Yeni Quiz Oluştur</h1>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Ana Sayfaya Dön
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    currentStep >= step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-20 h-1 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mb-8 text-center">
            <span className="text-sm text-gray-600">
              Adım {currentStep} / 3: {
                currentStep === 1 ? 'Temel Bilgiler' :
                currentStep === 2 ? 'Soru Ekle' :
                'İncele ve Yayınla'
              }
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 font-bold rounded-lg transition duration-200"
            >
              Önceki
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                disabled={currentStep === 1 && !quizData.title.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition duration-200"
              >
                Sonraki
              </button>
            ) : (
              <button
                onClick={saveQuiz}
                disabled={loading || quizData.questions.length === 0}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition duration-200"
              >
                {loading ? 'Yayınlanıyor...' : 'Quiz\'i Yayınla'}
              </button>
            )}
          </div>
        </div>

        {/* AI Quiz Generator Modal */}
        <AIQuizGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onQuizGenerated={handleAIQuizGenerated}
        />
      </div>
    </div>
  );
};

export default CreateQuiz;