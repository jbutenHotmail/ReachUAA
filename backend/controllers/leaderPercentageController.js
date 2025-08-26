import * as db from '../config/database.js';

// Get all leader percentages
export const getLeaderPercentages = async (req, res) => {
  try {
    const { programId, leaderId, isActive } = req.query;
    
    let query = `
      SELECT lp.id, lp.leader_id as leaderId, CONCAT(p.first_name, ' ', p.last_name) as leaderName,
      lp.program_id as programId, pr.name as programName, lp.percentage, lp.is_active as isActive,
      lp.created_at as createdAt, lp.updated_at as updatedAt
      FROM leader_percentages lp
      JOIN people p ON lp.leader_id = p.id
      JOIN programs pr ON lp.program_id = pr.id
      WHERE p.person_type = 'LEADER'
    `;
    
    const params = [];
    const conditions = [];
    
    if (programId) {
      conditions.push('lp.program_id = ?');
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      conditions.push('lp.program_id = ?');
      params.push(req.user.currentProgramId);
    }
    
    if (leaderId) {
      conditions.push('lp.leader_id = ?');
      params.push(leaderId);
    }
    
    if (isActive !== undefined) {
      conditions.push('lp.is_active = ?');
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.first_name, p.last_name';
    
    const percentages = await db.query(query, params);
    
    res.json(percentages);
  } catch (error) {
    console.error('Error getting leader percentages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leader percentage by ID
export const getLeaderPercentageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const percentage = await db.getOne(
      `SELECT lp.id, lp.leader_id as leaderId, CONCAT(p.first_name, ' ', p.last_name) as leaderName,
       lp.program_id as programId, pr.name as programName, lp.percentage, lp.is_active as isActive,
       lp.created_at as createdAt, lp.updated_at as updatedAt
       FROM leader_percentages lp
       JOIN people p ON lp.leader_id = p.id
       JOIN programs pr ON lp.program_id = pr.id
       WHERE lp.id = ? AND p.person_type = 'LEADER'`,
      [id]
    );
    
    if (!percentage) {
      return res.status(404).json({ message: 'Leader percentage not found' });
    }
    
    res.json(percentage);
  } catch (error) {
    console.error('Error getting leader percentage:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new leader percentage
export const createLeaderPercentage = async (req, res) => {
  try {
    const { leaderId, percentage, programId } = req.body;
    
    // Get current program ID from user or request
    const currentProgramId = programId || (req.user && req.user.currentProgramId);
    
    if (!currentProgramId) {
      return res.status(400).json({ message: 'Program ID is required' });
    }
    
    // Validate required fields
    if (!leaderId || percentage === undefined) {
      return res.status(400).json({ message: 'Leader ID and percentage are required' });
    }
    
    // Check if leader exists and is a LEADER
    const leader = await db.getOne(
      'SELECT * FROM people WHERE id = ? AND person_type = ?',
      [leaderId, 'LEADER']
    );
    
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    // Check if percentage already exists for this leader in this program
    const existingPercentage = await db.getOne(
      'SELECT * FROM leader_percentages WHERE leader_id = ? AND program_id = ?',
      [leaderId, currentProgramId]
    );
    
    if (existingPercentage) {
      return res.status(400).json({ message: 'Leader percentage already exists for this program' });
    }
    
    // Validate percentage range
    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ message: 'Percentage must be between 0 and 100' });
    }
    
    // Insert leader percentage
    const percentageId = await db.insert(
      'INSERT INTO leader_percentages (leader_id, program_id, percentage, is_active) VALUES (?, ?, ?, ?)',
      [leaderId, currentProgramId, percentage, true]
    );
    
    // Get the created percentage
    const leaderPercentage = await db.getOne(
      `SELECT lp.id, lp.leader_id as leaderId, CONCAT(p.first_name, ' ', p.last_name) as leaderName,
       lp.program_id as programId, pr.name as programName, lp.percentage, lp.is_active as isActive,
       lp.created_at as createdAt, lp.updated_at as updatedAt
       FROM leader_percentages lp
       JOIN people p ON lp.leader_id = p.id
       JOIN programs pr ON lp.program_id = pr.id
       WHERE lp.id = ?`,
      [percentageId]
    );
    
    res.status(201).json(leaderPercentage);
  } catch (error) {
    console.error('Error creating leader percentage:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update leader percentage
export const updateLeaderPercentage = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage, isActive } = req.body;
    
    // Check if percentage exists
    const existingPercentage = await db.getOne(
      'SELECT * FROM leader_percentages WHERE id = ?',
      [id]
    );
    
    if (!existingPercentage) {
      return res.status(404).json({ message: 'Leader percentage not found' });
    }
    
    // Validate percentage range if provided
    if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
      return res.status(400).json({ message: 'Percentage must be between 0 and 100' });
    }
    
    // Update leader percentage
    await db.update(
      'UPDATE leader_percentages SET percentage = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [
        percentage !== undefined ? percentage : existingPercentage.percentage,
        isActive !== undefined ? isActive : existingPercentage.is_active,
        id
      ]
    );
    
    // Get the updated percentage
    const updatedPercentage = await db.getOne(
      `SELECT lp.id, lp.leader_id as leaderId, CONCAT(p.first_name, ' ', p.last_name) as leaderName,
       lp.program_id as programId, pr.name as programName, lp.percentage, lp.is_active as isActive,
       lp.created_at as createdAt, lp.updated_at as updatedAt
       FROM leader_percentages lp
       JOIN people p ON lp.leader_id = p.id
       JOIN programs pr ON lp.program_id = pr.id
       WHERE lp.id = ?`,
      [id]
    );
    
    res.json(updatedPercentage);
  } catch (error) {
    console.error('Error updating leader percentage:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete leader percentage
export const deleteLeaderPercentage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if percentage exists
    const existingPercentage = await db.getOne(
      'SELECT * FROM leader_percentages WHERE id = ?',
      [id]
    );
    
    if (!existingPercentage) {
      return res.status(404).json({ message: 'Leader percentage not found' });
    }
    
    // Delete leader percentage
    await db.remove(
      'DELETE FROM leader_percentages WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Leader percentage deleted successfully' });
  } catch (error) {
    console.error('Error deleting leader percentage:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle leader percentage status
export const toggleLeaderPercentageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if percentage exists
    const existingPercentage = await db.getOne(
      'SELECT * FROM leader_percentages WHERE id = ?',
      [id]
    );
    
    if (!existingPercentage) {
      return res.status(404).json({ message: 'Leader percentage not found' });
    }
    
    // Toggle status
    const newStatus = !existingPercentage.is_active;
    
    await db.update(
      'UPDATE leader_percentages SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );
    
    res.json({ 
      message: `Leader percentage ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Error toggling leader percentage status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getLeaderPercentages,
  getLeaderPercentageById,
  createLeaderPercentage,
  updateLeaderPercentage,
  deleteLeaderPercentage,
  toggleLeaderPercentageStatus
};