import express from 'express';
import { 
  getBonificationStatus,
  getAllColporterBonifications,
  getAvailablePrograms,
  getBonificationConfig,
  updateBonificationConfig
} from '../controllers/bonificationController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get bonification status for a specific user/person
router.get('/status/:id', authenticateToken, getBonificationStatus);

// Get all colporter bonifications (admin/supervisor only)
router.get('/all', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getAllColporterBonifications);

// Get available programs for bonifications
router.get('/programs', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getAvailablePrograms);

// Get bonification configuration
router.get('/config', authenticateToken, getBonificationConfig);

// Update bonification configuration (admin only)
router.put('/config', authenticateToken, authorizeRoles(['ADMIN']), updateBonificationConfig);

export default router;