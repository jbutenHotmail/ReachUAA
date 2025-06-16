import express from 'express';
import { 
  getDailyReport, 
  getWeeklyReport, 
  getMonthlyReport, 
  getColporterReport,
  getLeaderReport,
  getProgramReport,
  getIndividualEarningsReport,
  getSalesHistory,
  getFinancialSummary
} from '../controllers/reportController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get daily report (admin only)
router.get('/daily', authenticateToken, authorizeRoles(['ADMIN']), getDailyReport);

// Get weekly report (admin only)
router.get('/weekly', authenticateToken, authorizeRoles(['ADMIN']), getWeeklyReport);

// Get monthly report (admin only)
router.get('/monthly', authenticateToken, authorizeRoles(['ADMIN']), getMonthlyReport);

// Get colporter report (admin only)
router.get('/colporter/:id', authenticateToken, authorizeRoles(['ADMIN']), getColporterReport);

// Get leader report (admin only)
router.get('/leader/:id', authenticateToken, authorizeRoles(['ADMIN']), getLeaderReport);

// Get program report (admin only)
router.get('/program', authenticateToken, authorizeRoles(['ADMIN']), getProgramReport);

// Get individual earnings report (admin only)
router.get('/earnings/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR', 'VIEWER']), getIndividualEarningsReport);

// New endpoints for dashboard
router.get('/sales-history/:userId/:period?', authenticateToken, getSalesHistory);
router.get('/summary/:userId', authenticateToken, getFinancialSummary);

export default router;