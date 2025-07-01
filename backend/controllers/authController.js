import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import * as db from '../config/database.js';

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await db.getOne(
      'SELECT u.id, u.email, u.password_hash, u.role, u.status, ' +
      'p.id as person_id, p.first_name, p.last_name, p.profile_image_url, p.program_id ' +
      'FROM users u ' +
      'LEFT JOIN people p ON u.person_id = p.id ' +
      'WHERE u.email = ?',
      [email]
    );
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create tokens
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : email
      },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRATION }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRATION }
    );
    
    // Update last login
    await db.update(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Return user data and access token
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : email,
        profile_image_url: user.profile_image_url,
        currentProgramId: user.program_id
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
    
    // Get user
    const user = await db.getOne(
      'SELECT u.id, u.email, u.role, ' +
      'p.first_name, p.last_name, p.profile_image_url, p.program_id ' +
      'FROM users u ' +
      'LEFT JOIN people p ON u.person_id = p.id ' +
      'WHERE u.id = ?',
      [decoded.id]
    );
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Create new access token
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email
      },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRATION }
    );
    
    res.json({ 
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
        profile_image_url: user.profile_image_url,
        currentProgramId: user.program_id
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// Logout
export const logout = async (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
  });
  
  res.json({ message: 'Logged out successfully' });
};

export default {
  login,
  refreshToken,
  logout
};