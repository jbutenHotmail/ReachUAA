import express from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../config/database.js';
import { config } from '../config/config.js';

const router = express.Router();

// This endpoint should only be accessible during initial setup
router.post('/create-admin', async (req, res) => {
  try {
    // Check setup key for security
    const { setupKey, adminData } = req.body;
    
    if (setupKey !== config.ADMIN_SETUP_KEY) {
      return res.status(401).json({ message: 'Invalid setup key' });
    }
    
    // Check if any admin users already exist
    // const existingAdmins = await db.query(
    //   'SELECT COUNT(*) as count FROM users WHERE role = ?',
    //   ['ADMIN']
    // );
    
    // if (existingAdmins[0].count > 0) {
    //   return res.status(400).json({ message: 'Admin users already exist' });
    // }
    // Check if person already exists
    const existingPerson = await db.getOne(
      'SELECT * FROM people WHERE email = ?',
      [adminData.email]
    );
    let personId = existingPerson?.id;  
    if(!personId) {
      // Create person record
      personId = await db.insert(
        'INSERT INTO people (first_name, last_name, email, phone, person_type, status) VALUES (?, ?, ?, ?, ?, ?)',
        [adminData.firstName, adminData.lastName, adminData.email, adminData.phone, 'LEADER', 'ACTIVE']
      );
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(adminData.password, 10);
    
    // Create user record
    await db.insert(
      'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [personId, adminData.email, passwordHash, 'ADMIN', 'ACTIVE']
    );
    
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
