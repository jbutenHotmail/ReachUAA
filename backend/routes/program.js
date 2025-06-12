import express from 'express';
import { 
  createProgram, 
  getProgram, 
  updateProgram, 
  getProgramWorkingDays,
  updateProgramWorkingDay,
  addCustomProgramDay,
  getFinancialConfig,
  updateFinancialConfig
} from '../controllers/programController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get active program
router.get('/', authenticateToken, getProgram);

// Create new program (admin only)
router.post('/', createProgram);

// Update program (admin only)
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN']), updateProgram);

// Get program working days
router.get('/:id/working-days', authenticateToken, getProgramWorkingDays);

// Update program working day (admin only)
router.put('/:id/working-days/:day', authenticateToken, authorizeRoles(['ADMIN']), updateProgramWorkingDay);

// Add custom program day (admin only)
router.post('/:id/custom-days', authenticateToken, authorizeRoles(['ADMIN']), addCustomProgramDay);

// Get financial config
router.get('/:id/financial-config', authenticateToken, getFinancialConfig);

// Update financial config (admin only)
router.put('/:id/financial-config', authenticateToken, authorizeRoles(['ADMIN']), updateFinancialConfig);

export default router;