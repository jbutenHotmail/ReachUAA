import express from 'express';
import { 
  getCashAdvances, 
  getCashAdvanceById, 
  createCashAdvance, 
  approveCashAdvance, 
  rejectCashAdvance,
  getWeeklySales
} from '../controllers/cashAdvanceController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all cash advances
router.get('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getCashAdvances);

// Get cash advance by ID
router.get('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getCashAdvanceById);

// Create new cash advance
router.post('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), createCashAdvance);

// Approve cash advance (admin only)
router.patch('/:id/approve', authenticateToken, authorizeRoles(['ADMIN']), approveCashAdvance);

// Reject cash advance (admin only)
router.patch('/:id/reject', authenticateToken, authorizeRoles(['ADMIN']), rejectCashAdvance);

// Get weekly sales for a person
router.get('/weekly-sales/:personId', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getWeeklySales);

export default router;