import express from 'express';
import { 
  getPeople,
  getColporters, 
  getColporterById, 
  createColporter, 
  updateColporter, 
  deleteColporter,
  getLeaders,
  getLeaderById,
  createLeader,
  updateLeader,
  deleteLeader
} from '../controllers/peopleController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all people
router.get('/', authenticateToken, getPeople);

// Colporter routes
router.get('/colporters', authenticateToken, getColporters);
router.get('/colporters/:id', authenticateToken, getColporterById);
router.post('/colporters', authenticateToken, authorizeRoles(['ADMIN']), createColporter);
router.put('/colporters/:id', authenticateToken, authorizeRoles(['ADMIN']), updateColporter);
router.delete('/colporters/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteColporter);

// Leader routes
router.get('/leaders', authenticateToken, getLeaders);
router.get('/leaders/:id', authenticateToken, getLeaderById);
router.post('/leaders', authenticateToken, authorizeRoles(['ADMIN']), createLeader);
router.put('/leaders/:id', authenticateToken, authorizeRoles(['ADMIN']), updateLeader);
router.delete('/leaders/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteLeader);

export default router;