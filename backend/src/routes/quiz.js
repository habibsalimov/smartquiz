import express from 'express';
import { 
  createQuiz, 
  getQuizzes, 
  getQuizById, 
  updateQuiz, 
  deleteQuiz 
} from '../controllers/quizController.js';
import { 
  generateAIQuiz, 
  checkAIStatus 
} from '../controllers/aiQuizController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// AI Quiz Generation routes (must be before /:quizId to avoid conflicts)
router.get('/ai-status', checkAIStatus);
router.post('/generate-ai', authenticateToken, generateAIQuiz);

// Public routes (with optional auth)
router.get('/', optionalAuth, getQuizzes);
router.get('/:quizId', optionalAuth, getQuizById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createQuiz);
router.put('/:quizId', authenticateToken, updateQuiz);
router.delete('/:quizId', authenticateToken, deleteQuiz);

export default router;