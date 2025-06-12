import express from 'express';
import { 
  getBooks, 
  getBookById, 
  createBook, 
  updateBook, 
  deleteBook, 
  toggleBookStatus,
  getInventoryMovements,
  createInventoryMovement,
  getInventoryCounts,
  updateInventoryCount
} from '../controllers/bookController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
// Get all books
// Get inventory counts
router.get('/counts/:date', authenticateToken, getInventoryCounts);
router.get('/', authenticateToken, getBooks);

// Get book by ID
router.get('/:id', authenticateToken, getBookById);

// Create new book (admin or supervisor)
router.post('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), createBook);

// Update book (admin or supervisor)
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), updateBook);

// Delete book (admin only)
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteBook);

// Toggle book status (admin only)
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles(['ADMIN']), toggleBookStatus);

// Get inventory movements
router.get('/:id/movements', authenticateToken, getInventoryMovements);

// Create inventory movement (admin or supervisor)
router.post('/:id/movements', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), createInventoryMovement);


// Update inventory count (admin or supervisor)
router.post('/:id/counts', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), updateInventoryCount);

export default router;