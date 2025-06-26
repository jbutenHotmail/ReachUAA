import * as db from '../config/database.js';

// Get all charges
export const getCharges = async (req, res) => {
  try {
    const { personId, personType, status, category, startDate, endDate, programId } = req.query;
    
    let query = `
      SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
      p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
      c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
      c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
      FROM charges c
      JOIN people p ON c.person_id = p.id
      JOIN users u ON c.applied_by = u.id
      JOIN people ap ON u.person_id = ap.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (personId) {
      conditions.push('c.person_id = ?');
      params.push(personId);
    }
    
    if (personType) {
      conditions.push('p.person_type = ?');
      params.push(personType);
    }
    
    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    
    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }
    
    if (startDate && endDate) {
      conditions.push('c.charge_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('c.charge_date >= ?');
      params.push(startDate);
    } else if (endDate) {
      conditions.push('c.charge_date <= ?');
      params.push(endDate);
    }
    
    if (programId) {
      conditions.push('c.program_id = ?');
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      conditions.push('c.program_id = ?');
      params.push(req.user.currentProgramId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY c.charge_date DESC, c.created_at DESC';
    
    const charges = await db.query(query, params);
    
    res.json(charges);
  } catch (error) {
    console.error('Error getting charges:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get charge by ID
export const getChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const charge = await db.getOne(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
       c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
       c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
       FROM charges c
       JOIN people p ON c.person_id = p.id
       JOIN users u ON c.applied_by = u.id
       JOIN people ap ON u.person_id = ap.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (!charge) {
      return res.status(404).json({ message: 'Charge not found' });
    }
    
    res.json(charge);
  } catch (error) {
    console.error('Error getting charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new charge
export const createCharge = async (req, res) => {
  try {
    const {
      personId,
      amount,
      reason,
      description,
      category,
      date,
      programId
    } = req.body;
    
    const userId = req.user.id;
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Check if person exists
    const person = await db.getOne(
      'SELECT * FROM people WHERE id = ?',
      [personId]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    // Insert charge
    const chargeId = await db.insert(
      'INSERT INTO charges (person_id, amount, reason, description, category, status, applied_by, charge_date, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [personId, amount, reason, description || null, category, 'PENDING', userId, date, currentProgramId]
    );
    
    // Get the created charge
    const charge = await db.getOne(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
       c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
       c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
       FROM charges c
       JOIN people p ON c.person_id = p.id
       JOIN users u ON c.applied_by = u.id
       JOIN people ap ON u.person_id = ap.id
       WHERE c.id = ?`,
      [chargeId]
    );
    
    res.status(201).json(charge);
  } catch (error) {
    console.error('Error creating charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update charge
export const updateCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      personId,
      amount,
      reason,
      description,
      category,
      status,
      date,
      programId
    } = req.body;
    
    // Check if charge exists
    const existingCharge = await db.getOne(
      'SELECT * FROM charges WHERE id = ?',
      [id]
    );
    
    if (!existingCharge) {
      return res.status(404).json({ message: 'Charge not found' });
    }
    
    // If changing person, check if person exists
    if (personId && personId !== existingCharge.person_id) {
      const person = await db.getOne(
        'SELECT * FROM people WHERE id = ?',
        [personId]
      );
      
      if (!person) {
        return res.status(404).json({ message: 'Person not found' });
      }
    }
    
    // Update charge
    await db.update(
      'UPDATE charges SET person_id = ?, amount = ?, reason = ?, description = ?, category = ?, status = ?, charge_date = ?, program_id = ?, updated_at = NOW() WHERE id = ?',
      [
        personId || existingCharge.person_id,
        amount !== undefined ? amount : existingCharge.amount,
        reason || existingCharge.reason,
        description !== undefined ? description : existingCharge.description,
        category || existingCharge.category,
        status || existingCharge.status,
        date || existingCharge.charge_date,
        programId || existingCharge.program_id,
        id
      ]
    );
    
    // Get the updated charge
    const updatedCharge = await db.getOne(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
       c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
       c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
       FROM charges c
       JOIN people p ON c.person_id = p.id
       JOIN users u ON c.applied_by = u.id
       JOIN people ap ON u.person_id = ap.id
       WHERE c.id = ?`,
      [id]
    );
    
    res.json(updatedCharge);
  } catch (error) {
    console.error('Error updating charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete charge
export const deleteCharge = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if charge exists
    const existingCharge = await db.getOne(
      'SELECT * FROM charges WHERE id = ?',
      [id]
    );
    
    if (!existingCharge) {
      return res.status(404).json({ message: 'Charge not found' });
    }
    
    // Delete charge
    await db.remove(
      'DELETE FROM charges WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Charge deleted successfully' });
  } catch (error) {
    console.error('Error deleting charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Apply charge
export const applyCharge = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if charge exists
    const existingCharge = await db.getOne(
      'SELECT * FROM charges WHERE id = ?',
      [id]
    );
    
    if (!existingCharge) {
      return res.status(404).json({ message: 'Charge not found' });
    }
    
    if (existingCharge.status === 'APPLIED') {
      return res.status(400).json({ message: 'Charge is already applied' });
    }
    
    // Update charge status
    await db.update(
      'UPDATE charges SET status = ?, updated_at = NOW() WHERE id = ?',
      ['APPLIED', id]
    );
    
    // Get the updated charge
    const updatedCharge = await db.getOne(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
       c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
       c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
       FROM charges c
       JOIN people p ON c.person_id = p.id
       JOIN users u ON c.applied_by = u.id
       JOIN people ap ON u.person_id = ap.id
       WHERE c.id = ?`,
      [id]
    );
    
    res.json({
      message: 'Charge applied successfully',
      charge: updatedCharge
    });
  } catch (error) {
    console.error('Error applying charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel charge
export const cancelCharge = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if charge exists
    const existingCharge = await db.getOne(
      'SELECT * FROM charges WHERE id = ?',
      [id]
    );
    
    if (!existingCharge) {
      return res.status(404).json({ message: 'Charge not found' });
    }
    
    if (existingCharge.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Charge is already cancelled' });
    }
    
    // Update charge status
    await db.update(
      'UPDATE charges SET status = ?, updated_at = NOW() WHERE id = ?',
      ['CANCELLED', id]
    );
    
    // Get the updated charge
    const updatedCharge = await db.getOne(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.description, c.category, c.status,
       c.applied_by as appliedBy, CONCAT(ap.first_name, ' ', ap.last_name) as appliedByName,
       c.charge_date as date, c.program_id as programId, c.created_at as createdAt, c.updated_at as updatedAt
       FROM charges c
       JOIN people p ON c.person_id = p.id
       JOIN users u ON c.applied_by = u.id
       JOIN people ap ON u.person_id = ap.id
       WHERE c.id = ?`,
      [id]
    );
    
    res.json({
      message: 'Charge cancelled successfully',
      charge: updatedCharge
    });
  } catch (error) {
    console.error('Error cancelling charge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};