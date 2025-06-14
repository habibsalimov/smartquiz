import { supabase, supabaseAdmin } from '../config/supabase.js';
import Joi from 'joi';

// Validation schemas
const quizSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).optional(),
  cover_image: Joi.string().uri().optional(),
  is_public: Joi.boolean().default(true),
  questions: Joi.array().items(
    Joi.object({
      question_text: Joi.string().min(3).required(),
      question_type: Joi.string().valid('multiple_choice', 'true_false').default('multiple_choice'),
      time_limit: Joi.number().min(5).max(120).default(30),
      points: Joi.number().min(100).max(2000).default(1000),
      order_index: Joi.number().min(0).required(),
      media_url: Joi.string().uri().optional(),
      media_type: Joi.string().valid('image', 'video').optional(),
      answer_options: Joi.array().items(
        Joi.object({
          option_text: Joi.string().min(1).max(255).required(),
          is_correct: Joi.boolean().required(),
          color: Joi.string().optional()
        })
      ).min(2).max(4).required()
    })
  ).min(1).required()
});

export const createQuiz = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    // Validate input
    const { error, value } = quizSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, cover_image, is_public, questions } = value;
    const userId = req.user.userId;

    // Create quiz
    const { data: newQuiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        creator_id: userId,
        title,
        description,
        cover_image,
        is_public
      })
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      return res.status(500).json({ error: 'Failed to create quiz' });
    }

    // Create questions and answers
    for (const question of questions) {
      const { data: newQuestion, error: questionError } = await supabaseAdmin
        .from('questions')
        .insert({
          quiz_id: newQuiz.id,
          question_text: question.question_text,
          question_type: question.question_type,
          time_limit: question.time_limit,
          points: question.points,
          order_index: question.order_index,
          media_url: question.media_url,
          media_type: question.media_type
        })
        .select()
        .single();

      if (questionError) {
        console.error('Question creation error:', questionError);
        // Cleanup: delete the quiz if question creation fails
        await supabaseAdmin.from('quizzes').delete().eq('id', newQuiz.id);
        return res.status(500).json({ error: 'Failed to create questions' });
      }

      // Create answer options
      const answerOptions = question.answer_options.map(option => ({
        question_id: newQuestion.id,
        option_text: option.option_text,
        is_correct: option.is_correct,
        color: option.color
      }));

      const { error: answersError } = await supabaseAdmin
        .from('answer_options')
        .insert(answerOptions);

      if (answersError) {
        console.error('Answer options creation error:', answersError);
        // Cleanup: delete the quiz if answer creation fails
        await supabaseAdmin.from('quizzes').delete().eq('id', newQuiz.id);
        return res.status(500).json({ error: 'Failed to create answer options' });
      }
    }

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
        description: newQuiz.description,
        questionCount: questions.length
      }
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

export const getQuizzes = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const userId = req.user?.userId;
    const { page = 1, limit = 10, search = '', my_quizzes = false } = req.query;

    let query = supabaseAdmin
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        cover_image,
        is_public,
        created_at,
        creator_id,
        users!quizzes_creator_id_fkey(username),
        questions(count)
      `);

    // Filter based on parameters
    if (my_quizzes === 'true' && userId) {
      query = query.eq('creator_id', userId);
      // Hide soft deleted quizzes from user's own quiz list
      query = query.not('title', 'like', '[DELETED]%');
    } else {
      query = query.eq('is_public', true);
      // Hide soft deleted quizzes from public list
      query = query.not('title', 'like', '[DELETED]%');
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: quizzes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Get quizzes error:', error);
      return res.status(500).json({ error: 'Failed to fetch quizzes' });
    }

    // Format response
    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      cover_image: quiz.cover_image,
      is_public: quiz.is_public,
      created_at: quiz.created_at,
      creator: quiz.users?.username || 'Unknown',
      question_count: quiz.questions[0]?.count || 0,
      is_owner: quiz.creator_id === userId
    }));

    res.json({
      quizzes: formattedQuizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedQuizzes.length
      }
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

export const getQuizById = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { quizId } = req.params;
    const userId = req.user?.userId;

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select(`
        *,
        users!quizzes_creator_id_fkey(username),
        questions(
          *,
          answer_options(*)
        )
      `)
      .eq('id', quizId)
      .single();

    if (error || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check if user has access to this quiz
    if (!quiz.is_public && quiz.creator_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Sort questions by order_index
    quiz.questions.sort((a, b) => a.order_index - b.order_index);

    // Format response
    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      cover_image: quiz.cover_image,
      is_public: quiz.is_public,
      created_at: quiz.created_at,
      creator: quiz.users?.username || 'Unknown',
      is_owner: quiz.creator_id === userId,
      questions: quiz.questions.map(question => ({
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        time_limit: question.time_limit,
        points: question.points,
        order_index: question.order_index,
        media_url: question.media_url,
        media_type: question.media_type,
        answer_options: question.answer_options.map(option => ({
          id: option.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          color: option.color
        }))
      }))
    };

    res.json({ quiz: formattedQuiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { quizId } = req.params;
    const userId = req.user.userId;

    // Check if user owns the quiz
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('creator_id')
      .eq('id', quizId)
      .single();

    if (!quiz || quiz.creator_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input (partial update)
    const updateSchema = Joi.object({
      title: Joi.string().min(3).max(255).optional(),
      description: Joi.string().max(1000).optional(),
      cover_image: Joi.string().uri().optional(),
      is_public: Joi.boolean().optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Update quiz
    const { data: updatedQuiz, error: updateError } = await supabaseAdmin
      .from('quizzes')
      .update(value)
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) {
      console.error('Quiz update error:', updateError);
      return res.status(500).json({ error: 'Failed to update quiz' });
    }

    res.json({
      message: 'Quiz updated successfully',
      quiz: {
        id: updatedQuiz.id,
        title: updatedQuiz.title,
        description: updatedQuiz.description,
        is_public: updatedQuiz.is_public
      }
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { quizId } = req.params;
    const userId = req.user.userId;

    // Check if user owns the quiz
    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('creator_id, title')
      .eq('id', quizId)
      .single();

    if (!quiz || quiz.creator_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // SOFT DELETE: Mark quiz as deleted instead of hard delete
    // This avoids foreign key constraint issues while hiding from UI
    const { error: softDeleteError } = await supabaseAdmin
      .from('quizzes')
      .update({ 
        title: `[DELETED] ${quiz.title}`,
        is_public: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', quizId);

    if (softDeleteError) {
      console.error('Quiz soft deletion error:', softDeleteError);
      return res.status(500).json({ error: 'Failed to delete quiz' });
    }

    console.log(`Quiz '${quiz.title}' (${quizId}) soft deleted successfully`);
    
    res.json({
      message: 'Quiz deleted successfully',
      deletedQuiz: {
        id: quizId,
        title: quiz.title
      }
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};