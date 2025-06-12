import express from 'express';
import { 
  getCharges, 
  getChargeById, 
  createCharge, 
  updateCharge, 
  deleteCharge,
  applyCharge,
  cancelCharge
} from '../controllers/chargeController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all charges
router.get('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getCharges);

// Get charge by ID
router.get('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getChargeById);

// Create new charge
router.post('/', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), createCharge);

// Update charge
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), updateCharge);

// Delete charge
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), deleteCharge);

// Apply charge
router.patch('/:id/apply', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), applyCharge);

// Cancel charge
router.patch('/:id/cancel', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), cancelCharge);

export default router;