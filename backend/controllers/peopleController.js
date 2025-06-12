import * as db from '../config/database.js';
import bcrypt from 'bcryptjs';

// Get all people
export const getPeople = async (req, res) => {
  try {
    const people = await db.query(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, person_type as personType,
       school, age, institution, created_at as createdAt, 
       updated_at as updatedAt, 
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       ORDER BY first_name, last_name`
    );
    
    res.json(people);
  } catch (error) {
    console.error('Error getting people:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all colporters
export const getColporters = async (req, res) => {
  try {
    const colporters = await db.query(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, 
       created_at as createdAt, updated_at as updatedAt, 'COLPORTER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE person_type = 'COLPORTER'
       ORDER BY first_name, last_name`
    );
    
    res.json(colporters);
  } catch (error) {
    console.error('Error getting colporters:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get colporter by ID
export const getColporterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const colporter = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, 
       created_at as createdAt, updated_at as updatedAt, 'COLPORTER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!colporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    res.json(colporter);
  } catch (error) {
    console.error('Error getting colporter:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new colporter
export const createColporter = async (req, res) => {
  try {
    const {
      name,
      apellido,
      email,
      phone,
      school,
      address,
      age,
      createUser,
      profileImage
    } = req.body;
    
    // Check if email already exists
    const existingPerson = await db.getOne(
      'SELECT * FROM people WHERE email = ?',
      [email]
    );
    
    if (existingPerson) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert person
      const [personResult] = await connection.execute(
        'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, school, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, apellido, email, phone, address, profileImage || null, 'COLPORTER', 'ACTIVE', school, age]
      );
      
      const personId = personResult.insertId;
      
      // Create user if needed
      if (createUser) {
        const passwordHash = await bcrypt.hash(`${name.toLowerCase()}.${apellido.toLowerCase()}`, 10);
        
        await connection.execute(
          'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
          [personId, email, passwordHash, 'VIEWER', 'ACTIVE']
        );
      }
      
      return { personId };
    });
    
    // Get the created colporter
    const colporter = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, 
       created_at as createdAt, updated_at as updatedAt, 'COLPORTER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ?`,
      [result.personId]
    );
    
    res.status(201).json(colporter);
  } catch (error) {
    console.error('Error creating colporter:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update colporter
export const updateColporter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      apellido,
      email,
      phone,
      school,
      address,
      age,
      status,
      profileImage
    } = req.body;
    
    // Check if colporter exists
    const existingColporter = await db.getOne(
      `SELECT *, (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!existingColporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    // If colporter has a user, don't allow changing name, apellido, or email
    if (existingColporter.hasUser) {
      // Update person
      await db.update(
        'UPDATE people SET phone = ?, address = ?, profile_image_url = ?, status = ?, school = ?, age = ?, updated_at = NOW() WHERE id = ?',
        [phone, address, profileImage || null, status, school, age, id]
      );
    } else {
      // Check if email already exists (if changing email)
      if (email !== existingColporter.email) {
        const existingEmail = await db.getOne(
          'SELECT * FROM people WHERE email = ? AND id != ?',
          [email, id]
        );
        
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }
      
      // Update person
      await db.update(
        'UPDATE people SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, profile_image_url = ?, status = ?, school = ?, age = ?, updated_at = NOW() WHERE id = ?',
        [name, apellido, email, phone, address, profileImage || null, status, school, age, id]
      );
    }
    
    // Get the updated colporter
    const updatedColporter = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, 
       created_at as createdAt, updated_at as updatedAt, 'COLPORTER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ?`,
      [id]
    );
    
    res.json(updatedColporter);
  } catch (error) {
    console.error('Error updating colporter:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete colporter
export const deleteColporter = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if colporter exists
    const existingColporter = await db.getOne(
      `SELECT *, (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!existingColporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    // Check if colporter has transactions
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE student_id = ?',
      [id]
    );
    
    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete colporter with transactions. Consider deactivating instead.' 
      });
    }
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Delete user if exists
      if (existingColporter.hasUser) {
        await connection.execute(
          'DELETE FROM users WHERE person_id = ?',
          [id]
        );
      }
      
      // Delete person
      await connection.execute(
        'DELETE FROM people WHERE id = ?',
        [id]
      );
    });
    
    res.json({ message: 'Colporter deleted successfully' });
  } catch (error) {
    console.error('Error deleting colporter:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all leaders
export const getLeaders = async (req, res) => {
  try {
    const leaders = await db.query(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, 
       created_at as createdAt, updated_at as updatedAt, 'LEADER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE person_type = 'LEADER'
       ORDER BY first_name, last_name`
    );
    
    res.json(leaders);
  } catch (error) {
    console.error('Error getting leaders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leader by ID
export const getLeaderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leader = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, 
       created_at as createdAt, updated_at as updatedAt, 'LEADER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'LEADER'`,
      [id]
    );
    
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    res.json(leader);
  } catch (error) {
    console.error('Error getting leader:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new leader
export const createLeader = async (req, res) => {
  try {
    const {
      name,
      apellido,
      email,
      phone,
      institution,
      address,
      createUser,
      profileImage
    } = req.body;
    
    // Check if email already exists
    const existingPerson = await db.getOne(
      'SELECT * FROM people WHERE email = ?',
      [email]
    );
    
    if (existingPerson) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert person
      const [personResult] = await connection.execute(
        'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, apellido, email, phone, address, profileImage || null, 'LEADER', 'ACTIVE', institution]
      );
      
      const personId = personResult.insertId;
      
      // Create user if needed
      if (createUser) {
        const passwordHash = await bcrypt.hash(`${name.toLowerCase()}.${apellido.toLowerCase()}`, 10);
        
        await connection.execute(
          'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
          [personId, email, passwordHash, 'SUPERVISOR', 'ACTIVE']
        );
      }
      
      return { personId };
    });
    
    // Get the created leader
    const leader = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, 
       created_at as createdAt, updated_at as updatedAt, 'LEADER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ?`,
      [result.personId]
    );
    
    res.status(201).json(leader);
  } catch (error) {
    console.error('Error creating leader:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update leader
export const updateLeader = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      apellido,
      email,
      phone,
      institution,
      address,
      status,
      profileImage
    } = req.body;
    
    // Check if leader exists
    const existingLeader = await db.getOne(
      `SELECT *, (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'LEADER'`,
      [id]
    );
    
    if (!existingLeader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    // If leader has a user, don't allow changing name, apellido, or email
    if (existingLeader.hasUser) {
      // Update person
      await db.update(
        'UPDATE people SET phone = ?, address = ?, profile_image_url = ?, status = ?, institution = ?, updated_at = NOW() WHERE id = ?',
        [phone, address, profileImage || null, status, institution, id]
      );
    } else {
      // Check if email already exists (if changing email)
      if (email !== existingLeader.email) {
        const existingEmail = await db.getOne(
          'SELECT * FROM people WHERE email = ? AND id != ?',
          [email, id]
        );
        
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }
      
      // Update person
      await db.update(
        'UPDATE people SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, profile_image_url = ?, status = ?, institution = ?, updated_at = NOW() WHERE id = ?',
        [name, apellido, email, phone, address, profileImage || null, status, institution, id]
      );
    }
    
    // Get the updated leader
    const updatedLeader = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, 
       created_at as createdAt, updated_at as updatedAt, 'LEADER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ?`,
      [id]
    );
    
    res.json(updatedLeader);
  } catch (error) {
    console.error('Error updating leader:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete leader
export const deleteLeader = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if leader exists
    const existingLeader = await db.getOne(
      `SELECT *, (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE id = ? AND person_type = 'LEADER'`,
      [id]
    );
    
    if (!existingLeader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    // Check if leader has transactions
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE leader_id = ?',
      [id]
    );
    
    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete leader with transactions. Consider deactivating instead.' 
      });
    }
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Delete user if exists
      if (existingLeader.hasUser) {
        await connection.execute(
          'DELETE FROM users WHERE person_id = ?',
          [id]
        );
      }
      
      // Delete person
      await connection.execute(
        'DELETE FROM people WHERE id = ?',
        [id]
      );
    });
    
    res.json({ message: 'Leader deleted successfully' });
  } catch (error) {
    console.error('Error deleting leader:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
