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
  getFinancialGoals,
  getFinancialSummary
} from '../controllers/reportController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get daily report
router.get('/daily', authenticateToken, getDailyReport);

// Get weekly report
router.get('/weekly', authenticateToken, getWeeklyReport);

// Get monthly report
router.get('/monthly', authenticateToken, getMonthlyReport);

// Get colporter report
router.get('/colporter/:id', authenticateToken, getColporterReport);

// Get leader report
router.get('/leader/:id', authenticateToken, getLeaderReport);

// Get program report
router.get('/program', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getProgramReport);

// Get individual earnings report
router.get('/earnings/:id', authenticateToken, getIndividualEarningsReport);

// New endpoints for dashboard
router.get('/sales-history/:userId/:period?', authenticateToken, getSalesHistory);
router.get('/goals/:userId', authenticateToken, getFinancialGoals);
router.get('/summary/:userId', authenticateToken, getFinancialSummary);

export default router;