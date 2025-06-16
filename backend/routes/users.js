import express from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  changePassword,
  getRolePermissions,
  updateRolePermissions
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRoles(['ADMIN']), getUsers);

// Get user by ID (admin only)
router.get('/:id', authenticateToken, authorizeRoles(['ADMIN', 'SUPERVISOR', 'VIEWER']), getUserById);

// Create new user (admin only)
router.post('/', authorizeRoles(['ADMIN']), createUser);

// Update user (admin only)
router.put('/:id', authenticateToken, authorizeRoles(['ADMIN']), updateUser);

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteUser);

// Change password (any authenticated user for their own password)
router.post('/change-password', authenticateToken, changePassword);

// Get role permissions (admin only)
router.get('/roles/permissions', authenticateToken, authorizeRoles(['ADMIN']), getRolePermissions);

// Update role permissions (admin only)
router.put('/roles/permissions', authenticateToken, authorizeRoles(['ADMIN']), updateRolePermissions);

export default router;