import express from 'express';
import { getAchievements, getBookCategories, getProgramStats } from '../controllers/achievementsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get achievements for different categories
router.get('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR', 'VIEWER']), getAchievements);

// Get all book categories
router.get('/book-categories', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR', 'VIEWER']), getBookCategories);

// Get program statistics
router.get('/program-stats', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR', 'VIEWER']), getProgramStats);

export default router;
