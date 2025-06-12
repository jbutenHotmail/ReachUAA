import * as db from '../config/database.js';

// Get all expenses
export const getExpenses = async (req, res) => {
  try {
    const { leaderId, category, startDate, endDate } = req.query;
    
    let query = `
      SELECT e.id, e.leader_id as leaderId, 
      CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leaderName,
      e.amount, e.motivo, e.category, e.notes, e.expense_date as date,
      e.created_by as createdBy, CONCAT(cp.first_name, ' ', cp.last_name) as createdByName,
      e.created_at as createdAt, e.updated_at as updatedAt
      FROM expenses e
      LEFT JOIN people p ON e.leader_id = p.id
      JOIN users u ON e.created_by = u.id
      JOIN people cp ON u.person_id = cp.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (leaderId) {
      if (leaderId === 'program') {
        conditions.push('e.leader_id IS NULL');
      } else {
        conditions.push('e.leader_id = ?');
        params.push(leaderId);
      }
    }
    
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }
    
    if (startDate && endDate) {
      conditions.push('e.expense_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('e.expense_date >= ?');
      params.push(startDate);
    } else if (endDate) {
      conditions.push('e.expense_date <= ?');
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    
    const expenses = await db.query(query, params);
    
    res.json(expenses);
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await db.getOne(
      `SELECT e.id, e.leader_id as leaderId, 
       CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leaderName,
       e.amount, e.motivo, e.category, e.notes, e.expense_date as date,
       e.created_by as createdBy, CONCAT(cp.first_name, ' ', cp.last_name) as createdByName,
       e.created_at as createdAt, e.updated_at as updatedAt
       FROM expenses e
       LEFT JOIN people p ON e.leader_id = p.id
       JOIN users u ON e.created_by = u.id
       JOIN people cp ON u.person_id = cp.id
       WHERE e.id = ?`,
      [id]
    );
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new expense
export const createExpense = async (req, res) => {
  try {
    const {
      leaderId,
      amount,
      motivo,
      category,
      notes,
      date
    } = req.body;
    
    const userId = req.user.id;
    
    // If leaderId is provided, check if leader exists
    if (leaderId && leaderId !== 'program') {
      const leader = await db.getOne(
        'SELECT * FROM people WHERE id = ? AND person_type = ?',
        [leaderId, 'LEADER']
      );
      
      if (!leader) {
        return res.status(404).json({ message: 'Leader not found' });
      }
    }
    
    // Insert expense
    const expenseId = await db.insert(
      'INSERT INTO expenses (leader_id, amount, motivo, category, notes, expense_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [leaderId === 'program' ? null : leaderId, amount, motivo, category, notes || null, date, userId]
    );
    
    // Get the created expense
    const expense = await db.getOne(
      `SELECT e.id, e.leader_id as leaderId, 
       CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leaderName,
       e.amount, e.motivo, e.category, e.notes, e.expense_date as date,
       e.created_by as createdBy, CONCAT(cp.first_name, ' ', cp.last_name) as createdByName,
       e.created_at as createdAt, e.updated_at as updatedAt
       FROM expenses e
       LEFT JOIN people p ON e.leader_id = p.id
       JOIN users u ON e.created_by = u.id
       JOIN people cp ON u.person_id = cp.id
       WHERE e.id = ?`,
      [expenseId]
    );
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      leaderId,
      amount,
      motivo,
      category,
      notes,
      date
    } = req.body;
    
    // Check if expense exists
    const existingExpense = await db.getOne(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    if (!existingExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // If changing leader, check if leader exists
    if (leaderId !== undefined && leaderId !== 'program' && leaderId !== existingExpense.leader_id) {
      const leader = await db.getOne(
        'SELECT * FROM people WHERE id = ? AND person_type = ?',
        [leaderId, 'LEADER']
      );
      
      if (!leader) {
        return res.status(404).json({ message: 'Leader not found' });
      }
    }
    
    // Update expense
    await db.update(
      'UPDATE expenses SET leader_id = ?, amount = ?, motivo = ?, category = ?, notes = ?, expense_date = ?, updated_at = NOW() WHERE id = ?',
      [
        leaderId === 'program' ? null : (leaderId !== undefined ? leaderId : existingExpense.leader_id),
        amount !== undefined ? amount : existingExpense.amount,
        motivo || existingExpense.motivo,
        category || existingExpense.category,
        notes !== undefined ? notes : existingExpense.notes,
        date || existingExpense.expense_date,
        id
      ]
    );
    
    // Get the updated expense
    const updatedExpense = await db.getOne(
      `SELECT e.id, e.leader_id as leaderId, 
       CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leaderName,
       e.amount, e.motivo, e.category, e.notes, e.expense_date as date,
       e.created_by as createdBy, CONCAT(cp.first_name, ' ', cp.last_name) as createdByName,
       e.created_at as createdAt, e.updated_at as updatedAt
       FROM expenses e
       LEFT JOIN people p ON e.leader_id = p.id
       JOIN users u ON e.created_by = u.id
       JOIN people cp ON u.person_id = cp.id
       WHERE e.id = ?`,
      [id]
    );
    
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if expense exists
    const existingExpense = await db.getOne(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    if (!existingExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Delete expense
    await db.remove(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};