import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import * as db from '../config/database.js';

// Authenticate token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token is required' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    
    // Get user details
    const user = await db.getOne(
      'SELECT id, role FROM users WHERE id = ? AND status = ?',
      [decoded.id, 'ACTIVE']
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    // Get current program for the user
    const currentProgram = await db.getOne(
      'SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE',
      [user.id]
    );

    // Attach user info to request
    req.user = {
      id: user.id,
      role: user.role,
      currentProgramId: currentProgram?.program_id || null
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Authorize roles middleware
export const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export default {
  authenticateToken,
  authorizeRoles
};