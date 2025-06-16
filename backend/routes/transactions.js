import express from 'express';
import { 
  getTransactions, 
  getTransactionById, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
  getTransactionBooks
} from '../controllers/transactionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all transactions
router.get('/', authenticateToken, getTransactions);

// Get transaction by ID
router.get('/:id', authenticateToken, getTransactionById);

// Create new transaction
router.post('/', authenticateToken, createTransaction);

// Update transaction
router.put('/:id', authenticateToken, updateTransaction);

// Delete transaction (admin only)
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteTransaction);

// Approve transaction (admin only)
router.patch('/:id/approve', authenticateToken, authorizeRoles(['ADMIN']), approveTransaction);

// Reject transaction (admin only)
router.patch('/:id/reject', authenticateToken, authorizeRoles(['ADMIN']), rejectTransaction);

// Get transaction books
router.get('/:id/books', authenticateToken, getTransactionBooks);

export default router;