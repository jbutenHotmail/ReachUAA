import express from 'express';
import { login, refreshToken, logout } from '../controllers/authController.js';

const router = express.Router();

// Login route
router.post('/login', login);

// Refresh token route
router.post('/refresh-token', refreshToken);

// Logout route
router.post('/logout', logout);

export default router;