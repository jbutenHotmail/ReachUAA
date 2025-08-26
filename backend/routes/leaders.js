import express from 'express';
import { 
  getLeaderPercentages,
  getLeaderPercentageById,
  createLeaderPercentage,
  updateLeaderPercentage,
  deleteLeaderPercentage,
  toggleLeaderPercentageStatus
} from '../controllers/leaderPercentageController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all leader percentages
router.get('/percentages', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getLeaderPercentages);

// Get leader percentage by ID
router.get('/percentages/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), getLeaderPercentageById);

// Create new leader percentage (admin only)
router.post('/percentages', authenticateToken, authorizeRoles(['ADMIN']), createLeaderPercentage);

// Update leader percentage (admin only)
router.put('/percentages/:id', authenticateToken, authorizeRoles(['ADMIN']), updateLeaderPercentage);

// Delete leader percentage (admin only)
router.delete('/percentages/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteLeaderPercentage);

// Toggle leader percentage status (admin only)
router.patch('/percentages/:id/toggle', authenticateToken, authorizeRoles(['ADMIN']), toggleLeaderPercentageStatus);

export default router;