import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    
    next();
  };
};

export default {
  authenticateToken,
  authorizeRoles
};