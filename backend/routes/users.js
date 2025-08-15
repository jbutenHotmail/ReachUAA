import express from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  changePassword,
  resetPassword,
  getUserProfile,
  updateProfile,
  getRolePermissions,
  updateRolePermissions,
  searchUserByEmail
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRoles(['ADMIN']), getUsers);

// Search user by email (admin only)
router.get('/search', authenticateToken, authorizeRoles(['ADMIN']), searchUserByEmail);

// Get user by ID - Allow users to get their own data
router.get('/:id', authenticateToken, getUserById);

// Create new user (admin only)
router.post('/', authenticateToken, authorizeRoles(['ADMIN']), createUser);

// Update user (admin only)
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN']), updateUser);

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteUser);

// Reset user password (admin only)
router.post('/:id/reset-password', authenticateToken, authorizeRoles(['ADMIN']), resetPassword);

// Get user profile (any authenticated user)
router.get('/profile/me', authenticateToken, getUserProfile);

// Update user profile (any authenticated user)
router.put('/profile', authenticateToken, updateProfile);

// Change password (any authenticated user for their own password)
router.post('/change-password', authenticateToken, changePassword);

// Get role permissions (admin only)
router.get('/roles/permissions', authenticateToken, authorizeRoles(['ADMIN']), getRolePermissions);

// Update role permissions (admin only)
router.put('/roles/permissions', authenticateToken, authorizeRoles(['ADMIN']), updateRolePermissions);

export default router;