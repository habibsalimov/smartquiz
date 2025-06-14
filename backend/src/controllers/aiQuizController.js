import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../config/supabase.js';
import Joi from 'joi';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Validation schema for AI quiz generation
const aiQuizSchema = Joi.object({
  topic: Joi.string().min(2).max(100).required(),
  difficulty: Joi.string().valid('kolay', 'orta', 'zor').default('orta'),
  category: Joi.string().max(50).optional(),
  questionCount: Joi.number().min(5).max(15).default(10)
});

export const generateAIQuiz = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI servisi konfigüre edilmemiş' });
    }

    // Validate input
    const { error, value } = aiQuizSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { topic, difficulty, category, questionCount } = value;
    const userId = req.user.userId;

    // Create AI prompt for quiz generation
    const prompt = createQuizPrompt(topic, difficulty, category, questionCount);

    try {
      // Get Gemini model
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      console.log('Generating AI quiz for topic:', topic);
      
      // Generate content with Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('AI Response received, parsing...');

      // Parse the AI response
      const quizData = parseAIResponse(text);
      
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        throw new Error('AI geçersiz quiz formatı döndürdü');
      }

      // Validate and format the generated quiz
      const formattedQuiz = formatQuizForDatabase(quizData, topic, userId);

      console.log(`Successfully generated ${formattedQuiz.questions.length} questions`);

      res.status(200).json({
        message: 'AI quiz başarıyla oluşturuldu',
        quiz: formattedQuiz,
        generatedBy: 'Gemini 2.5 Flash'
      });

    } catch (aiError) {
      console.error('Gemini AI Error:', aiError);
      
      // Provide specific error messages for common issues
      let errorMessage = 'AI quiz oluşturulurken hata oluştu';
      if (aiError.message?.includes('API_KEY')) {
        errorMessage = 'AI servisi API anahtarı geçersiz';
      } else if (aiError.message?.includes('quota')) {
        errorMessage = 'AI servisi kullanım kotası aşıldı';
      } else if (aiError.message?.includes('safety')) {
        errorMessage = 'Konu içeriği AI güvenlik politikalarına uygun değil';
      }

      return res.status(500).json({ error: errorMessage });
    }

  } catch (error) {
    console.error('Generate AI quiz error:', error);
    res.status(500).json({ error: 'AI quiz oluşturulamadı' });
  }
};

function createQuizPrompt(topic, difficulty, category, questionCount) {
  const difficultyMap = {
    'kolay': 'kolay (temel seviye)',
    'orta': 'orta (lise seviyesi)', 
    'zor': 'zor (üniversite seviyesi)'
  };

  const difficultyText = difficultyMap[difficulty] || 'orta';
  const categoryText = category ? ` (${category} kategorisinde)` : '';

  return `Sen bir eğitim uzmanısın. "${topic}" konusunda${categoryText} ${questionCount} soruluk Türkçe çoktan seçmeli quiz oluştur.

ÖNEMLI KURALLAR:
- Zorluk seviyesi: ${difficultyText}
- Her soru için TAM OLARAK 4 cevap seçeneği olmalı
- Her soruda SADECE 1 doğru cevap olmalı
- Sorular açık, net ve Türkçe dilbilgisi kurallarına uygun olmalı
- Cevaplar karışık sırada olmalı (doğru cevap hep A olmasın)
- Sorular konuyla alakalı ve öğretici olmalı

JSON formatında şu yapıda döndür:
{
  "title": "Quiz başlığı (${topic} hakkında)",
  "description": "Quiz açıklaması (1-2 cümle)",
  "questions": [
    {
      "question_text": "Soru metni burada",
      "answer_options": [
        {
          "option_text": "A seçeneği",
          "is_correct": true,
          "color": "red"
        },
        {
          "option_text": "B seçeneği", 
          "is_correct": false,
          "color": "blue"
        },
        {
          "option_text": "C seçeneği",
          "is_correct": false,
          "color": "yellow"
        },
        {
          "option_text": "D seçeneği",
          "is_correct": false,
          "color": "green"
        }
      ]
    }
  ]
}

SADECE JSON döndür, başka açıklama ekleme. ${questionCount} soru oluştur.`;
}

function parseAIResponse(text) {
  try {
    // Clean the response - remove any markdown formatting or extra text
    let cleanText = text.trim();
    
    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json\s*/gi, '');
    cleanText = cleanText.replace(/```\s*/gi, '');
    
    // Find JSON content
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('JSON content not found in AI response');
    }
    
    const jsonText = cleanText.slice(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonText);
    
    // Validate basic structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid questions structure');
    }
    
    return parsed;
  } catch (error) {
    console.error('AI Response parsing error:', error);
    console.error('Raw AI response:', text);
    throw new Error('AI yanıtı işlenemedi: ' + error.message);
  }
}

function formatQuizForDatabase(quizData, originalTopic, userId) {
  const colors = ['red', 'blue', 'yellow', 'green'];
  
  return {
    title: quizData.title || `${originalTopic} Quiz'i`,
    description: quizData.description || `${originalTopic} konusunda AI tarafından oluşturulan quiz`,
    is_public: true,
    questions: quizData.questions.map((question, index) => {
      // Ensure we have exactly 4 answer options
      let options = question.answer_options || [];
      
      // If we don't have enough options, create generic ones
      while (options.length < 4) {
        options.push({
          option_text: `Seçenek ${options.length + 1}`,
          is_correct: false,
          color: colors[options.length % 4]
        });
      }
      
      // Take only first 4 options
      options = options.slice(0, 4);
      
      // Ensure each option has a color
      options = options.map((option, optIndex) => ({
        id: `ai_${Date.now()}_${index}_${optIndex}`,
        option_text: option.option_text || `Seçenek ${optIndex + 1}`,
        is_correct: Boolean(option.is_correct),
        color: option.color || colors[optIndex]
      }));
      
      // Ensure exactly one correct answer
      const correctCount = options.filter(opt => opt.is_correct).length;
      if (correctCount !== 1) {
        // Reset all to false and make first one correct
        options.forEach(opt => opt.is_correct = false);
        options[0].is_correct = true;
      }
      
      return {
        id: `ai_q_${Date.now()}_${index}`,
        question_text: question.question_text || `Soru ${index + 1}`,
        question_type: 'multiple_choice',
        time_limit: 30,
        points: 1000,
        order_index: index,
        answer_options: options
      };
    })
  };
}

// Health check endpoint for AI service
export const checkAIStatus = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        status: 'unavailable',
        message: 'GEMINI_API_KEY konfigüre edilmemiş' 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Simple test to check if API key works
    const result = await model.generateContent("Test");
    
    res.json({ 
      status: 'available',
      message: 'AI servisi kullanılabilir',
      model: 'Gemini 2.5 Flash'
    });
  } catch (error) {
    console.error('AI Status check error:', error);
    res.status(503).json({ 
      status: 'error',
      message: 'AI servisi şu anda kullanılamıyor' 
    });
  }
};