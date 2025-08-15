import * as db from '../config/database.js';

// Get all cash advances
export const getCashAdvances = async (req, res) => {
  try {
    const { personId, personType, status, startDate, endDate, programId } = req.query;
    
    let query = `
      SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
      p.person_type as personType, ca.week_start_date as weekStartDate, ca.week_end_date as weekEndDate,
      ca.total_sales as totalSales, ca.transaction_count as transactionCount, ca.advance_amount as advanceAmount,
      ca.status, ca.request_date as requestDate, ca.approved_date as approvedDate,
      ca.approved_by as approvedBy, ca.program_id as programId,
      CASE WHEN ca.approved_by IS NOT NULL THEN CONCAT(ap.first_name, ' ', ap.last_name) ELSE NULL END as approvedByName,
      ca.created_at as createdAt, ca.updated_at as updatedAt
      FROM cash_advances ca
      JOIN people p ON ca.person_id = p.id
      LEFT JOIN users u ON ca.approved_by = u.id
      LEFT JOIN people ap ON u.person_id = ap.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (personId) {
      conditions.push('ca.person_id = ?');
      params.push(personId);
    }
    
    if (personType) {
      conditions.push('p.person_type = ?');
      params.push(personType);
    }
    
    if (status) {
      conditions.push('ca.status = ?');
      params.push(status);
    }
    
    if (startDate && endDate) {
      conditions.push('ca.week_start_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('ca.week_start_date >= ?');
      params.push(startDate);
    } else if (endDate) {
      conditions.push('ca.week_start_date <= ?');
      params.push(endDate);
    }
    
    if (programId) {
      conditions.push('ca.program_id = ?');
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      conditions.push('ca.program_id = ?');
      params.push(req.user.currentProgramId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY ca.request_date DESC';
    
    const advances = await db.query(query, params);
    
    res.json(advances);
  } catch (error) {
    console.error('Error getting cash advances:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get cash advance by ID
export const getCashAdvanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const advance = await db.getOne(
      `SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, ca.week_start_date as weekStartDate, ca.week_end_date as weekEndDate,
       ca.total_sales as totalSales, ca.transaction_count as transactionCount, ca.advance_amount as advanceAmount,
       ca.status, ca.request_date as requestDate, ca.approved_date as approvedDate,
       ca.approved_by as approvedBy, ca.program_id as programId,
       CASE WHEN ca.approved_by IS NOT NULL THEN CONCAT(ap.first_name, ' ', ap.last_name) ELSE NULL END as approvedByName,
       ca.created_at as createdAt, ca.updated_at as updatedAt
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people ap ON u.person_id = ap.id
       WHERE ca.id = ?`,
      [id]
    );
    
    if (!advance) {
      return res.status(404).json({ message: 'Cash advance not found' });
    }
    
    res.json(advance);
  } catch (error) {
    console.error('Error getting cash advance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new cash advance
export const createCashAdvance = async (req, res) => {
  try {
    const {
      personId,
      personType,
      personName,
      weekStartDate,
      weekEndDate,
      totalSales,
      transactionCount,
      advanceAmount,
      programId
    } = req.body;
    
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Check if person exists
    const person = await db.getOne(
      'SELECT * FROM people WHERE id = ?',
      [personId]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    // Check if advance already exists for this week that is pendding or approved
    const existingAdvance = await db.getOne(
      'SELECT * FROM cash_advances WHERE person_id = ? AND week_start_date = ? AND week_end_date = ? AND status IN (?, ?)',
      [personId, weekStartDate, weekEndDate, 'PENDING', 'APPROVED']
    );
    
    if (existingAdvance) {
      return res.status(400).json({ 
        message: 'Cash advance already exists for this week' 
      });
    }
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [currentProgramId]
    );
    
    // Calculate maximum advance amount
    const maxPercentage = personType === 'COLPORTER' 
      ? financialConfig?.colporter_cash_advance_percentage || 20
      : financialConfig?.leader_cash_advance_percentage || 25;
    
    const maxAdvanceAmount = totalSales * (maxPercentage / 100);
    
    if (advanceAmount > maxAdvanceAmount) {
      return res.status(400).json({ 
        message: `Advance amount exceeds maximum allowed (${maxPercentage}% of weekly sales)` 
      });
    }
    
    // Insert cash advance
    const advanceId = await db.insert(
      'INSERT INTO cash_advances (person_id, week_start_date, week_end_date, total_sales, transaction_count, advance_amount, status, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [personId, weekStartDate, weekEndDate, totalSales, transactionCount, advanceAmount, 'PENDING', currentProgramId]
    );
    
    // Get the created advance
    const advance = await db.getOne(
      `SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, ca.week_start_date as weekStartDate, ca.week_end_date as weekEndDate,
       ca.total_sales as totalSales, ca.transaction_count as transactionCount, ca.advance_amount as advanceAmount,
       ca.status, ca.request_date as requestDate, ca.approved_date as approvedDate,
       ca.approved_by as approvedBy, ca.program_id as programId,
       CASE WHEN ca.approved_by IS NOT NULL THEN CONCAT(ap.first_name, ' ', ap.last_name) ELSE NULL END as approvedByName,
       ca.created_at as createdAt, ca.updated_at as updatedAt
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people ap ON u.person_id = ap.id
       WHERE ca.id = ?`,
      [advanceId]
    );
    
    res.status(201).json(advance);
  } catch (error) {
    console.error('Error creating cash advance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve cash advance
export const approveCashAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if advance exists
    const existingAdvance = await db.getOne(
      'SELECT * FROM cash_advances WHERE id = ?',
      [id]
    );
    
    if (!existingAdvance) {
      return res.status(404).json({ message: 'Cash advance not found' });
    }
    
    if (existingAdvance.status !== 'PENDING') {
      return res.status(400).json({ 
        message: `Cash advance is already ${existingAdvance.status.toLowerCase()}` 
      });
    }
    
    // Update advance status
    await db.update(
      'UPDATE cash_advances SET status = ?, approved_by = ?, approved_date = NOW(), updated_at = NOW() WHERE id = ?',
      ['APPROVED', userId, id]
    );
    
    // Get the updated advance
    const updatedAdvance = await db.getOne(
      `SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, ca.week_start_date as weekStartDate, ca.week_end_date as weekEndDate,
       ca.total_sales as totalSales, ca.transaction_count as transactionCount, ca.advance_amount as advanceAmount,
       ca.status, ca.request_date as requestDate, ca.approved_date as approvedDate,
       ca.approved_by as approvedBy, ca.program_id as programId,
       CASE WHEN ca.approved_by IS NOT NULL THEN CONCAT(ap.first_name, ' ', ap.last_name) ELSE NULL END as approvedByName,
       ca.created_at as createdAt, ca.updated_at as updatedAt
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people ap ON u.person_id = ap.id
       WHERE ca.id = ?`,
      [id]
    );
    
    res.json({
      message: 'Cash advance approved successfully',
      advance: updatedAdvance
    });
  } catch (error) {
    console.error('Error approving cash advance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject cash advance
export const rejectCashAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if advance exists
    const existingAdvance = await db.getOne(
      'SELECT * FROM cash_advances WHERE id = ?',
      [id]
    );
    
    if (!existingAdvance) {
      return res.status(404).json({ message: 'Cash advance not found' });
    }
    
    if (existingAdvance.status !== 'PENDING') {
      return res.status(400).json({ 
        message: `Cash advance is already ${existingAdvance.status.toLowerCase()}` 
      });
    }
    
    // Update advance status
    await db.update(
      'UPDATE cash_advances SET status = ?, updated_at = NOW() WHERE id = ?',
      ['REJECTED', id]
    );
    
    // Get the updated advance
    const updatedAdvance = await db.getOne(
      `SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, ca.week_start_date as weekStartDate, ca.week_end_date as weekEndDate,
       ca.total_sales as totalSales, ca.transaction_count as transactionCount, ca.advance_amount as advanceAmount,
       ca.status, ca.request_date as requestDate, ca.approved_date as approvedDate,
       ca.approved_by as approvedBy, ca.program_id as programId,
       CASE WHEN ca.approved_by IS NOT NULL THEN CONCAT(ap.first_name, ' ', ap.last_name) ELSE NULL END as approvedByName,
       ca.created_at as createdAt, ca.updated_at as updatedAt
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people ap ON u.person_id = ap.id
       WHERE ca.id = ?`,
      [id]
    );
    
    res.json({
      message: 'Cash advance rejected successfully',
      advance: updatedAdvance
    });
  } catch (error) {
    console.error('Error rejecting cash advance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get weekly sales for a person
export const getWeeklySales = async (req, res) => {
  try {
    const { personId } = req.params;
    const { weekStartDate, weekEndDate, programId } = req.query;
    
    if (!weekStartDate || !weekEndDate) {
      return res.status(400).json({ message: 'Week start date and end date are required' });
    }
    
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Check if person exists
    const person = await db.getOne(
      'SELECT * FROM people WHERE id = ?',
      [personId]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    // Instead of using temporary tables with the stored procedure, we'll directly query the data
    // This avoids the issue with MySQL's sql_require_primary_key setting
    
    // Get the person type
    const personType = person.person_type;
    
    // Initialize result object
    let weeklySales = {
      colporterId: parseInt(personId),
      colporterName: `${person.first_name} ${person.last_name}`,
      weekStartDate,
      weekEndDate,
      totalSales: 0,
      transactionCount: 0,
      dailySales: {}
    };
    
    // Query transactions based on person type
    if (personType === 'COLPORTER') {
      // For colporters, get their own transactions
      const salesResult = await db.getOne(
        `SELECT 
          COALESCE(SUM(t.total), 0) as total_sales,
          COUNT(t.id) as transaction_count
        FROM transactions t
        WHERE t.student_id = ?
          AND t.transaction_date BETWEEN ? AND ?
          AND t.status IN ('PENDING', 'APPROVED')
          AND (t.program_id = ? OR t.program_id IS NULL)`,
        [personId, weekStartDate, weekEndDate, currentProgramId]
      );
      
      // Get daily sales
      const dailySalesResult = await db.query(
        `SELECT 
          t.transaction_date as date,
          COALESCE(SUM(t.total), 0) as amount
        FROM transactions t
        WHERE t.student_id = ?
          AND t.transaction_date BETWEEN ? AND ?
          AND t.status IN ('PENDING', 'APPROVED')
          AND (t.program_id = ? OR t.program_id IS NULL)
        GROUP BY t.transaction_date
        ORDER BY t.transaction_date`,
        [personId, weekStartDate, weekEndDate, currentProgramId]
      );
      
      weeklySales.totalSales = salesResult.total_sales;
      weeklySales.transactionCount = salesResult.transaction_count;
      
      // Format daily sales as object
      dailySalesResult.forEach(day => {
        weeklySales.dailySales[day.date] = day.amount;
      });
    } else {
      // For leaders, get transactions from their team
      const salesResult = await db.getOne(
        `SELECT 
          COALESCE(SUM(t.total), 0) as total_sales,
          COUNT(t.id) as transaction_count
        FROM transactions t
        WHERE t.leader_id = ?
          AND t.transaction_date BETWEEN ? AND ?
          AND t.status IN ('PENDING', 'APPROVED')
          AND (t.program_id = ? OR t.program_id IS NULL)`,
        [personId, weekStartDate, weekEndDate, currentProgramId]
      );
      
      // Get daily sales
      const dailySalesResult = await db.query(
        `SELECT 
          t.transaction_date as date,
          COALESCE(SUM(t.total), 0) as amount
        FROM transactions t
        WHERE t.leader_id = ?
          AND t.transaction_date BETWEEN ? AND ?
          AND t.status IN ('PENDING', 'APPROVED')
          AND (t.program_id = ? OR t.program_id IS NULL)
        GROUP BY t.transaction_date
        ORDER BY t.transaction_date`,
        [personId, weekStartDate, weekEndDate, currentProgramId]
      );
      
      weeklySales.totalSales = salesResult.total_sales;
      weeklySales.transactionCount = salesResult.transaction_count;
      
      // Format daily sales as object
      dailySalesResult.forEach(day => {
        weeklySales.dailySales[day.date] = day.amount;
      });
    }
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Calculate maximum advance amount
    const maxPercentage = person.person_type === 'COLPORTER' 
      ? parseFloat(financialConfig?.colporter_cash_advance_percentage) || 20
      : parseFloat(financialConfig?.leader_cash_advance_percentage) || 25;
    
    const maxAdvanceAmount = weeklySales.totalSales * (maxPercentage / 100);
    
    // Add max advance amount to response
    weeklySales.maxAdvanceAmount = maxAdvanceAmount;
    weeklySales.maxAdvancePercentage = maxPercentage;
    
    res.json(weeklySales);
  } catch (error) {
    console.error('Error getting weekly sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};