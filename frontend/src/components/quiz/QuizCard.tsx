import React from 'react';

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

interface QuizCardProps {
  quiz: Quiz;
  onEdit: () => void;
  onDelete: () => void;
  onHost: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onEdit, onDelete, onHost }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Cover Image or Default Header */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {quiz.cover_image ? (
          <img
            src={quiz.cover_image}
            alt={quiz.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-sm font-medium">Quiz</div>
            </div>
          </div>
        )}
        
        {/* Visibility Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            quiz.is_public 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}>
            {quiz.is_public ? '🌍 Herkese Açık' : '🔒 Özel'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {truncateText(quiz.title, 50)}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 h-12 overflow-hidden">
          {quiz.description ? truncateText(quiz.description, 120) : 'Açıklama bulunmuyor'}
        </p>

        {/* Stats */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="mr-1">📊</span>
              {quiz.question_count} soru
            </span>
            <span className="flex items-center">
              <span className="mr-1">📅</span>
              {formatDate(quiz.created_at)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onHost}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
            title="Bu quiz ile oyun başlat"
          >
            🎮 Oyun Başlat
          </button>
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
            title="Quiz'i düzenle"
          >
            ✏️ Düzenle
          </button>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
            title="Quiz'i sil"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Quick Info Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Oluşturan: {quiz.creator}</span>
          <span className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              quiz.is_public ? 'bg-green-400' : 'bg-gray-400'
            }`}></span>
            {quiz.is_public ? 'Herkes görebilir' : 'Sadece siz görebilirsiniz'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuizCard;