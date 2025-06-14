import React from 'react';

interface AnswerOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  color: string;
}

interface AnswerOptionsProps {
  options: AnswerOption[];
  questionType: 'multiple_choice' | 'true_false';
  onUpdate: (options: AnswerOption[]) => void;
}

const AnswerOptions: React.FC<AnswerOptionsProps> = ({ 
  options, 
  questionType, 
  onUpdate 
}) => {
  const shapes = ['▲', '◆', '●', '■'];

  const updateOption = (index: number, field: keyof AnswerOption, value: string | boolean) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onUpdate(newOptions);
  };

  const setCorrectAnswer = (index: number) => {
    const newOptions = options.map((option, i) => ({
      ...option,
      is_correct: i === index
    }));
    onUpdate(newOptions);
  };

  const getColorClass = (color: string, isCorrect: boolean) => {
    const baseClasses = {
      red: 'bg-red-500 hover:bg-red-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600',
      green: 'bg-green-500 hover:bg-green-600'
    };

    const correctClasses = {
      red: 'bg-red-600 ring-4 ring-red-300',
      blue: 'bg-blue-600 ring-4 ring-blue-300',
      yellow: 'bg-yellow-600 ring-4 ring-yellow-300',
      green: 'bg-green-600 ring-4 ring-green-300'
    };

    return isCorrect ? correctClasses[color as keyof typeof correctClasses] : baseClasses[color as keyof typeof baseClasses];
  };

  if (questionType === 'true_false') {
    // True/False questions - only show 2 options
    const trueFalseOptions = [
      { ...options[0], option_text: 'Doğru', color: 'green' },
      { ...options[1], option_text: 'Yanlış', color: 'red' }
    ];

    return (
      <div className="grid grid-cols-2 gap-4">
        {trueFalseOptions.map((option, index) => (
          <div
            key={index}
            className={`relative p-6 rounded-lg text-white font-bold text-center cursor-pointer transition-all duration-200 transform hover:scale-105 ${
              getColorClass(option.color, option.is_correct)
            }`}
            onClick={() => setCorrectAnswer(index)}
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-3xl">{index === 0 ? '✓' : '✗'}</span>
              <span className="text-xl">{option.option_text}</span>
            </div>
            {option.is_correct && (
              <div className="absolute top-2 right-2">
                <span className="bg-white text-green-600 px-2 py-1 rounded-full text-xs font-bold">
                  DOĞRU
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Multiple choice questions - show all 4 options
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {options.map((option, index) => (
          <div key={option.id} className="space-y-2">
            {/* Option Button Preview */}
            <div
              className={`relative p-4 rounded-lg text-white font-bold text-center cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                getColorClass(option.color, option.is_correct)
              }`}
              onClick={() => setCorrectAnswer(index)}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{shapes[index]}</span>
                <span className="text-lg truncate">
                  {option.option_text || `Seçenek ${index + 1}`}
                </span>
              </div>
              {option.is_correct && (
                <div className="absolute top-2 right-2">
                  <span className="bg-white text-green-600 px-2 py-1 rounded-full text-xs font-bold">
                    DOĞRU
                  </span>
                </div>
              )}
            </div>

            {/* Option Text Input */}
            <div className="relative">
              <input
                type="text"
                value={option.option_text}
                onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  option.is_correct ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                placeholder={`Seçenek ${index + 1} metni`}
                maxLength={255}
                required
              />
              <div className="absolute right-3 top-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    option.color === 'red' ? 'bg-red-500' :
                    option.color === 'blue' ? 'bg-blue-500' :
                    option.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-sm">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Nasıl kullanılır:</p>
            <ul className="space-y-1 text-xs">
              <li>• Doğru cevap olarak işaretlemek için bir seçeneğe tıklayın</li>
              <li>• Her cevap seçeneği için metin girin</li>
              <li>• Renkler otomatik olarak atanır (kırmızı, mavi, sarı, yeşil)</li>
              <li>• Aynı anda sadece bir seçenek doğru olabilir</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className={`flex items-center space-x-1 ${
            options.some(opt => opt.is_correct) ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{options.some(opt => opt.is_correct) ? '✓' : '⚠️'}</span>
            <span>Doğru cevap seçildi</span>
          </span>
          <span className={`flex items-center space-x-1 ${
            options.every(opt => opt.option_text.trim()) ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{options.every(opt => opt.option_text.trim()) ? '✓' : '⚠️'}</span>
            <span>Tüm seçeneklerde metin var</span>
          </span>
        </div>
        <span className="text-gray-500">
          {options.filter(opt => opt.option_text.trim()).length}/4 seçenek dolduruldu
        </span>
      </div>
    </div>
  );
};

export default AnswerOptions;