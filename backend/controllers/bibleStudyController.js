import * as db from '../config/database.js';

// Get all bible studies
export const getBibleStudies = async (req, res) => {
  try {
    const { colporterId, studyType, municipalityId, programId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = `
      SELECT bs.id, bs.colporter_id as colporterId, CONCAT(p.first_name, ' ', p.last_name) as colporterName,
      bs.name, bs.phone, bs.address, bs.location, bs.municipality_id as municipalityId,
      m.name as municipalityName, c.name as countryName,
      bs.study_type as studyType, bs.interest_topic as interestTopic,
      bs.physical_description as physicalDescription, bs.photo_url as photoUrl, bs.notes, 
      bs.program_id as programId, bs.created_at as createdAt, bs.updated_at as updatedAt
      FROM bible_studies bs
      JOIN people p ON bs.colporter_id = p.id
      LEFT JOIN municipalities m ON bs.municipality_id = m.id
      LEFT JOIN countries c ON m.country_id = c.id
    `;
    
    const params = [];
    const conditions = [];
    
    // If user is VIEWER, only show their own bible studies
    if (userRole === 'VIEWER') {
      // Get the person_id for this user
      const user = await db.getOne(
        'SELECT person_id FROM users WHERE id = ?',
        [userId]
      );
      
      if (user && user.person_id) {
        conditions.push('bs.colporter_id = ?');
        params.push(user.person_id);
      } else {
        // If user has no person_id, return empty results
        return res.json([]);
      }
    }
    
    if (colporterId) {
      conditions.push('bs.colporter_id = ?');
      params.push(colporterId);
    }
    
    if (studyType) {
      conditions.push('bs.study_type = ?');
      params.push(studyType);
    }
    
    if (municipalityId) {
      conditions.push('bs.municipality_id = ?');
      params.push(municipalityId);
    }
    
    if (programId) {
      conditions.push('bs.program_id = ?');
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      conditions.push('bs.program_id = ?');
      params.push(req.user.currentProgramId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY bs.created_at DESC';
    
    const bibleStudies = await db.query(query, params);
    console.log(bibleStudies)
    res.json(bibleStudies);
  } catch (error) {
    console.error('Error getting bible studies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get bible study by ID
export const getBibleStudyById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = `
      SELECT bs.id, bs.colporter_id as colporterId, CONCAT(p.first_name, ' ', p.last_name) as colporterName,
      bs.name, bs.phone, bs.address, bs.location, bs.municipality_id as municipalityId,
      m.name as municipalityName, c.name as countryName,
      bs.study_type as studyType, bs.interest_topic as interestTopic,
      bs.physical_description as physicalDescription, bs.photo_url as photoUrl, bs.notes, 
      bs.program_id as programId, bs.created_at as createdAt, bs.updated_at as updatedAt
      FROM bible_studies bs
      JOIN people p ON bs.colporter_id = p.id
      LEFT JOIN municipalities m ON bs.municipality_id = m.id
      LEFT JOIN countries c ON m.country_id = c.id
      WHERE bs.id = ?
    `;
    
    const params = [id];
    
    // If user is VIEWER, only allow access to their own bible studies
    if (userRole === 'VIEWER') {
      const user = await db.getOne(
        'SELECT person_id FROM users WHERE id = ?',
        [userId]
      );
      
      if (user && user.person_id) {
        query += ' AND bs.colporter_id = ?';
        params.push(user.person_id);
      } else {
        return res.status(404).json({ message: 'Bible study not found' });
      }
    }
    
    const bibleStudy = await db.getOne(query, params);
    
    if (!bibleStudy) {
      return res.status(404).json({ message: 'Bible study not found' });
    }
    
    res.json(bibleStudy);
  } catch (error) {
    console.error('Error getting bible study:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get municipalities
export const getMunicipalities = async (req, res) => {
  try {
    const { countryId } = req.query;
    
    let query = `
      SELECT m.id, m.name, m.country_id as countryId, c.name as countryName
      FROM municipalities m
      JOIN countries c ON m.country_id = c.id
    `;
    
    const params = [];
    
    if (countryId) {
      query += ' WHERE m.country_id = ?';
      params.push(countryId);
    }
    
    query += ' ORDER BY m.name ASC';
    
    const municipalities = await db.query(query, params);
    
    res.json(municipalities);
  } catch (error) {
    console.error('Error getting municipalities:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get countries
export const getCountries = async (req, res) => {
  try {
    const countries = await db.query(
      'SELECT id, name, code FROM countries ORDER BY name ASC'
    );
    
    res.json(countries);
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new bible study
export const createBibleStudy = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      location,
      municipalityId,
      studyType,
      interestTopic,
      physicalDescription,
      photoUrl,
      notes,
      programId
    } = req.body;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Get colporter_id based on user role
    let colporterId;
    
    if (userRole === 'VIEWER') {
      // For VIEWER users, get their person_id
      const user = await db.getOne(
        'SELECT person_id FROM users WHERE id = ?',
        [userId]
      );
      
      if (!user || !user.person_id) {
        return res.status(400).json({ message: 'User is not associated with a colporter profile' });
      }
      
      // Verify the person is a colporter
      const person = await db.getOne(
        'SELECT * FROM people WHERE id = ? AND person_type = ?',
        [user.person_id, 'COLPORTER']
      );
      
      if (!person) {
        return res.status(400).json({ message: 'User is not a colporter' });
      }
      
      colporterId = user.person_id;
    } else {
      // For ADMIN/SUPERVISOR, they can specify the colporter (this would be for future functionality)
      return res.status(403).json({ message: 'Only colporters can create bible studies' });
    }
    
    // Validate required fields
    if (!name || !phone || !studyType) {
      return res.status(400).json({ message: 'Name, phone, and study type are required' });
    }
    
    // Validate municipality if provided
    if (municipalityId) {
      const municipality = await db.getOne(
        'SELECT * FROM municipalities WHERE id = ?',
        [municipalityId]
      );
      
      if (!municipality) {
        return res.status(400).json({ message: 'Invalid municipality' });
      }
    }
    
    // Insert bible study
    const bibleStudyId = await db.insert(
      'INSERT INTO bible_studies (colporter_id, name, phone, address, location, municipality_id, study_type, interest_topic, physical_description, photo_url, notes, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [colporterId, name, phone, address || null, location || null, municipalityId || null, studyType, interestTopic || null, physicalDescription || null, photoUrl || null, notes || null, currentProgramId]
    );
    
    // Get the created bible study
    const bibleStudy = await db.getOne(
      `SELECT bs.id, bs.colporter_id as colporterId, CONCAT(p.first_name, ' ', p.last_name) as colporterName,
       bs.name, bs.phone, bs.address, bs.location, bs.municipality_id as municipalityId,
       m.name as municipalityName, c.name as countryName,
       bs.study_type as studyType, bs.interest_topic as interestTopic,
       bs.physical_description as physicalDescription, bs.photo_url as photoUrl, bs.notes, 
       bs.program_id as programId, bs.created_at as createdAt, bs.updated_at as updatedAt
       FROM bible_studies bs
       JOIN people p ON bs.colporter_id = p.id
       LEFT JOIN municipalities m ON bs.municipality_id = m.id
       LEFT JOIN countries c ON m.country_id = c.id
       WHERE bs.id = ?`,
      [bibleStudyId]
    );
    
    res.status(201).json(bibleStudy);
  } catch (error) {
    console.error('Error creating bible study:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update bible study
export const updateBibleStudy = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      address,
      location,
      municipalityId,
      studyType,
      interestTopic,
      physicalDescription,
      photoUrl,
      notes
    } = req.body;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if bible study exists
    const existingStudy = await db.getOne(
      'SELECT * FROM bible_studies WHERE id = ?',
      [id]
    );
    
    if (!existingStudy) {
      return res.status(404).json({ message: 'Bible study not found' });
    }
    
    // If user is VIEWER, only allow updating their own bible studies
    if (userRole === 'VIEWER') {
      const user = await db.getOne(
        'SELECT person_id FROM users WHERE id = ?',
        [userId]
      );
      
      if (!user || user.person_id !== existingStudy.colporter_id) {
        return res.status(403).json({ message: 'You can only update your own bible studies' });
      }
    }
    
    // Validate municipality if provided
    if (municipalityId) {
      const municipality = await db.getOne(
        'SELECT * FROM municipalities WHERE id = ?',
        [municipalityId]
      );
      
      if (!municipality) {
        return res.status(400).json({ message: 'Invalid municipality' });
      }
    }
    
    // Update bible study
    await db.update(
      'UPDATE bible_studies SET name = ?, phone = ?, address = ?, location = ?, municipality_id = ?, study_type = ?, interest_topic = ?, physical_description = ?, photo_url = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      [
        name || existingStudy.name,
        phone || existingStudy.phone,
        address !== undefined ? address : existingStudy.address,
        location !== undefined ? location : existingStudy.location,
        municipalityId !== undefined ? municipalityId : existingStudy.municipality_id,
        studyType || existingStudy.study_type,
        interestTopic !== undefined ? interestTopic : existingStudy.interest_topic,
        physicalDescription !== undefined ? physicalDescription : existingStudy.physical_description,
        photoUrl !== undefined ? photoUrl : existingStudy.photo_url,
        notes !== undefined ? notes : existingStudy.notes,
        id
      ]
    );
    
    // Get the updated bible study
    const updatedStudy = await db.getOne(
      `SELECT bs.id, bs.colporter_id as colporterId, CONCAT(p.first_name, ' ', p.last_name) as colporterName,
       bs.name, bs.phone, bs.address, bs.location, bs.municipality_id as municipalityId,
       m.name as municipalityName, c.name as countryName,
       bs.study_type as studyType, bs.interest_topic as interestTopic,
       bs.physical_description as physicalDescription, bs.photo_url as photoUrl, bs.notes, 
       bs.program_id as programId, bs.created_at as createdAt, bs.updated_at as updatedAt
       FROM bible_studies bs
       JOIN people p ON bs.colporter_id = p.id
       LEFT JOIN municipalities m ON bs.municipality_id = m.id
       LEFT JOIN countries c ON m.country_id = c.id
       WHERE bs.id = ?`,
      [id]
    );
    
    res.json(updatedStudy);
  } catch (error) {
    console.error('Error updating bible study:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete bible study
export const deleteBibleStudy = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if bible study exists
    const existingStudy = await db.getOne(
      'SELECT * FROM bible_studies WHERE id = ?',
      [id]
    );
    
    if (!existingStudy) {
      return res.status(404).json({ message: 'Bible study not found' });
    }
    
    // If user is VIEWER, only allow deleting their own bible studies
    if (userRole === 'VIEWER') {
      const user = await db.getOne(
        'SELECT person_id FROM users WHERE id = ?',
        [userId]
      );
      
      if (!user || user.person_id !== existingStudy.colporter_id) {
        return res.status(403).json({ message: 'You can only delete your own bible studies' });
      }
    }
    
    // Delete bible study
    await db.remove(
      'DELETE FROM bible_studies WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Bible study deleted successfully' });
  } catch (error) {
    console.error('Error deleting bible study:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getBibleStudies,
  getBibleStudyById,
  createBibleStudy,
  updateBibleStudy,
  deleteBibleStudy,
  getMunicipalities,
  getCountries
};