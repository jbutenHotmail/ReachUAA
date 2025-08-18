import express from 'express';
import { 
  uploadProfileImage, 
  uploadProgramLogo, 
  uploadBookImage, 
  uploadBibleStudyPhoto,
  upload 
} from '../controllers/uploadController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Upload profile image (any authenticated user)
router.post('/profile', authenticateToken, upload.single('image'), uploadProfileImage);

// Upload program logo (admin only)
router.post('/program-logo', authenticateToken, authorizeRoles(['ADMIN']), upload.single('image'), uploadProgramLogo);

// Upload book image (admin or supervisor)
router.post('/book', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR']), upload.single('image'), uploadBookImage);

// Upload bible study photo (any authenticated user)
router.post('/bible-study', authenticateToken, upload.single('image'), uploadBibleStudyPhoto);

export default router;