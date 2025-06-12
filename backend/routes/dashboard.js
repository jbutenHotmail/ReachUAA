import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, getDashboardStats);

export default router;