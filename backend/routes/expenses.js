import express from 'express';
import { 
  getExpenses, 
  getExpenseById, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  approveExpense,
  rejectExpense
} from '../controllers/expenseController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getExpenses);

// Get expense by ID
router.get('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getExpenseById);

// Create new expense
router.post('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), createExpense);

// Update expense
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), updateExpense);

// Delete expense
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), deleteExpense);

// Approve expense (admin only)
router.patch('/:id/approve', authenticateToken, authorizeRoles(['ADMIN']), approveExpense);

// Reject expense (admin only)
router.patch('/:id/reject', authenticateToken, authorizeRoles(['ADMIN']), rejectExpense);

export default router;