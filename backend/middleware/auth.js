import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import * as db from '../config/database.js';

// Authenticate token middleware
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    
    // Get user from database to ensure it exists and is active
    const user = await db.getOne(
      'SELECT u.*, p.program_id as currentProgramId FROM users u LEFT JOIN people p ON u.person_id = p.id WHERE u.id = ?',
      [decoded.id]
    );
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'User account is inactive' });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      personId: user.person_id,
      currentProgramId: user.currentProgramId
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Authorize roles middleware
export const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
};

// Check permission middleware
export const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      // Get permission ID
      const permission = await db.getOne(
        'SELECT id FROM permissions WHERE name = ?',
        [permissionName]
      );
      
      if (!permission) {
        return res.status(403).json({ message: 'Permission not found' });
      }
      
      // Check if user's role has this permission
      const rolePermission = await db.getOne(
        'SELECT * FROM role_permissions WHERE role = ? AND permission_id = ?',
        [req.user.role, permission.id]
      );
      
      if (!rolePermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }
      
      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};