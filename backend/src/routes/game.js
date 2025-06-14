import express from 'express';
import { 
  createGameSession,
  joinGame,
  getGameSession,
  startGame,
  endGame,
  getActiveGames
} from '../controllers/gameController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required for joining games)
router.post('/join', joinGame);
router.get('/session/:gamePin', getGameSession);

// Protected routes (require authentication)
router.post('/create', authenticateToken, createGameSession);
router.post('/start/:gamePin', authenticateToken, startGame);
router.post('/end/:gamePin', authenticateToken, endGame);
router.get('/active', authenticateToken, getActiveGames);

export default router;