import express from 'express';
import { 
  getBibleStudies, 
  getBibleStudyById, 
  createBibleStudy, 
  updateBibleStudy, 
  deleteBibleStudy,
  getMunicipalities,
  getCountries
} from '../controllers/bibleStudyController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all bible studies
router.get('/', authenticateToken, getBibleStudies);

// Get bible study by ID
router.get('/:id', authenticateToken, getBibleStudyById);

// Create new bible study
router.post('/', authenticateToken, createBibleStudy);

// Update bible study
router.put('/:id', authenticateToken, updateBibleStudy);

// Delete bible study
router.delete('/:id', authenticateToken, deleteBibleStudy);

// Get municipalities
router.get('/locations/municipalities', authenticateToken, getMunicipalities);

// Get countries
router.get('/locations/countries', authenticateToken, getCountries);

export default router;