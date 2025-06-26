import bcrypt from 'bcryptjs';
import * as db from '../config/database.js';

// Get all people
export const getPeople = async (req, res) => {
  try {
    const { programId } = req.query;
    console.log('get people', programId);
    let query = `SELECT p.id, p.first_name as name, p.last_name as apellido, p.email, p.phone, 
              p.address, p.profile_image_url as profileImage, p.status, p.person_type as personType,
              p.school, p.age, p.institution, p.program_id as programId, p.created_at as createdAt, 
              p.updated_at as updatedAt, 
              CASE WHEN u.person_id IS NOT NULL THEN true ELSE false END as hasUser
       FROM people p
       LEFT JOIN users u ON u.person_id = p.id`;
    
    const params = [];
    
    if (programId) {
      query += " WHERE p.program_id = ?";
      params.push(programId);
    }
    
    query += " GROUP BY p.id ORDER BY p.first_name, p.last_name";
    
    const people = await db.query(query, params);
    
    res.json(people);
  } catch (error) {
    console.error('Error getting people:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all colporters
export const getColporters = async (req, res) => {
  try {
    const { programId } = req.query;
    
    let query = `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, program_id as programId,
       created_at as createdAt, updated_at as updatedAt, 'COLPORTER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE person_type = 'COLPORTER'`;
    
    const params = [];
    
    if (programId) {
      query += " AND program_id = ?";
      params.push(programId);
    }
    
    query += " ORDER BY first_name, last_name";
    
    const colporters = await db.query(query, params);
    
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
       address, profile_image_url as profileImage, status, school, age, program_id as programId,
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
      profileImage,
      programId
    } = req.body;
    
    // Check if email already exists in the same program
    const existingPerson = await db.getOne(
      'SELECT * FROM people WHERE email = ? AND program_id = ? AND person_type = ?',
      [email, programId, 'COLPORTER']
    );
    
    if (existingPerson) {
      return res.status(400).json({ message: 'Email already in use for a colporter in this program' });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert person
      const [personResult] = await connection.execute(
        'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, school, age, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, apellido, email, phone, address, profileImage || null, 'COLPORTER', 'ACTIVE', school, age, programId || null]
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
       address, profile_image_url as profileImage, status, school, age, program_id as programId,
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
      profileImage,
      programId
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
        'UPDATE people SET phone = ?, address = ?, profile_image_url = ?, status = ?, school = ?, age = ?, program_id = ?, updated_at = NOW() WHERE id = ?',
        [phone, address, profileImage || null, status, school, age, programId || existingColporter.program_id, id]
      );
    } else {
      // Check if email already exists (if changing email)
      if (email !== existingColporter.email) {
        const existingEmail = await db.getOne(
          'SELECT * FROM people WHERE email = ? AND program_id = ? AND person_type = ? AND id != ?',
          [email, programId || existingColporter.program_id, 'COLPORTER', id]
        );
        
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use for a colporter in this program' });
        }
      }
      
      // Update person
      await db.update(
        'UPDATE people SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, profile_image_url = ?, status = ?, school = ?, age = ?, program_id = ?, updated_at = NOW() WHERE id = ?',
        [name, apellido, email, phone, address, profileImage || null, status, school, age, programId || existingColporter.program_id, id]
      );
    }
    
    // Get the updated colporter
    const updatedColporter = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, school, age, program_id as programId,
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
    const { programId } = req.query;
    
    let query = `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, program_id as programId,
       created_at as createdAt, updated_at as updatedAt, 'LEADER' as personType,
       (SELECT COUNT(*) > 0 FROM users u WHERE u.person_id = id) as hasUser
       FROM people
       WHERE person_type = 'LEADER'`;
    
    const params = [];
    
    if (programId) {
      query += " AND program_id = ?";
      params.push(programId);
    }
    
    query += " ORDER BY first_name, last_name";
    
    const leaders = await db.query(query, params);
    
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
       address, profile_image_url as profileImage, status, institution, program_id as programId,
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
      profileImage,
      programId
    } = req.body;
    
    // Check if email already exists in the same program
    const existingPerson = await db.getOne(
      'SELECT * FROM people WHERE email = ? AND program_id = ? AND person_type = ?',
      [email, programId, 'LEADER']
    );
    
    if (existingPerson) {
      return res.status(400).json({ message: 'Email already in use for a leader in this program' });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert person
      const [personResult] = await connection.execute(
        'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, institution, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, apellido, email, phone, address, profileImage || null, 'LEADER', 'ACTIVE', institution, programId || null]
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
       address, profile_image_url as profileImage, status, institution, program_id as programId,
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
      profileImage,
      programId
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
        'UPDATE people SET phone = ?, address = ?, profile_image_url = ?, status = ?, institution = ?, program_id = ?, updated_at = NOW() WHERE id = ?',
        [phone, address, profileImage || null, status, institution, programId || existingLeader.program_id, id]
      );
    } else {
      // Check if email already exists (if changing email)
      if (email !== existingLeader.email) {
        const existingEmail = await db.getOne(
          'SELECT * FROM people WHERE email = ? AND program_id = ? AND person_type = ? AND id != ?',
          [email, programId || existingLeader.program_id, 'LEADER', id]
        );
        
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use for a leader in this program' });
        }
      }
      
      // Update person
      await db.update(
        'UPDATE people SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, profile_image_url = ?, status = ?, institution = ?, program_id = ?, updated_at = NOW() WHERE id = ?',
        [name, apellido, email, phone, address, profileImage || null, status, institution, programId || existingLeader.program_id, id]
      );
    }
    
    // Get the updated leader
    const updatedLeader = await db.getOne(
      `SELECT id, first_name as name, last_name as apellido, email, phone, 
       address, profile_image_url as profileImage, status, institution, program_id as programId,
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