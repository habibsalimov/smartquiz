import React, { useState } from 'react';
import AnswerOptions from './AnswerOptions';

interface AnswerOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  color: string;
}

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

interface QuestionEditorProps {
  question: Question;
  questionNumber: number;
  onUpdate: (question: Question) => void;
  onRemove: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  questionNumber,
  onUpdate,
  onRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateQuestion = (field: keyof Question, value: any) => {
    onUpdate({
      ...question,
      [field]: value
    });
  };

  const updateAnswerOptions = (newOptions: AnswerOption[]) => {
    updateQuestion('answer_options', newOptions);
  };

  const timeOptions = [
    { value: 5, label: '5 saniye' },
    { value: 10, label: '10 saniye' },
    { value: 20, label: '20 saniye' },
    { value: 30, label: '30 saniye' },
    { value: 60, label: '1 dakika' },
    { value: 90, label: '1.5 dakika' },
    { value: 120, label: '2 dakika' }
  ];

  const pointOptions = [
    { value: 100, label: '100 puan' },
    { value: 500, label: '500 puan' },
    { value: 1000, label: '1000 puan' },
    { value: 1500, label: '1500 puan' },
    { value: 2000, label: '2000 puan' }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Question Header */}
      <div 
        className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            {questionNumber}
          </span>
          <h3 className="font-semibold text-lg">
            {question.question_text || `Soru ${questionNumber}`}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {question.time_limit}s • {question.points} puan
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Kaldır
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Question Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soru Metni *
            </label>
            <textarea
              value={question.question_text}
              onChange={(e) => updateQuestion('question_text', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Sorunuzu buraya yazın..."
              rows={3}
              required
            />
          </div>

          {/* Question Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soru Türü
              </label>
              <select
                value={question.question_type}
                onChange={(e) => updateQuestion('question_type', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="multiple_choice">Çoktan Seçmeli</option>
                <option value="true_false">Doğru/Yanlış</option>
              </select>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Süre Limiti
              </label>
              <select
                value={question.time_limit}
                onChange={(e) => updateQuestion('time_limit', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puan
              </label>
              <select
                value={question.points}
                onChange={(e) => updateQuestion('points', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {pointOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Media URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medya URL'si (İsteğe Bağlı)
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={question.media_url || ''}
                onChange={(e) => updateQuestion('media_url', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://ornek.com/resim.jpg"
              />
              <select
                value={question.media_type || 'image'}
                onChange={(e) => updateQuestion('media_type', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="image">Resim</option>
                <option value="video">Video</option>
              </select>
            </div>
            {question.media_url && (
              <div className="mt-3">
                {question.media_type === 'image' ? (
                  <img
                    src={question.media_url}
                    alt="Soru medyası"
                    className="max-w-xs h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <video
                    src={question.media_url}
                    className="max-w-xs h-32 object-cover rounded-lg border"
                    controls
                    onError={(e) => {
                      (e.target as HTMLVideoElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cevap Seçenekleri *
            </label>
            <AnswerOptions
              options={question.answer_options}
              questionType={question.question_type}
              onUpdate={updateAnswerOptions}
            />
          </div>

          {/* Validation Messages */}
          <div className="text-sm">
            {!question.question_text.trim() && (
              <p className="text-red-600 mb-1">⚠️ Soru metni gerekli</p>
            )}
            {!question.answer_options.some(opt => opt.is_correct) && (
              <p className="text-red-600 mb-1">⚠️ En az bir doğru cevap gerekli</p>
            )}
            {question.answer_options.some(opt => !opt.option_text.trim()) && (
              <p className="text-red-600 mb-1">⚠️ Tüm cevap seçenekleri doldurulmalı</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;