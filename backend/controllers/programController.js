import * as db from '../config/database.js';
import bcrypt from 'bcryptjs';

// Create a new program
export const createProgram = async (req, res) => {
  try {
    const {
      name,
      motto,
      startDate,
      endDate,
      goal,
      workingDays,
      logo,
      colporterPercentage,
      leaderPercentage,
      colporterCashAdvancePercentage,
      leaderCashAdvancePercentage,
      books,
      colporters,
      leaders
    } = req.body;
    console.log(req.body)
    // Start a transaction
    const result = await db.transaction(async (connection) => {
      // Insert program
      const [programResult] = await connection.execute(
        'INSERT INTO programs (name, motto, start_date, end_date, financial_goal, logo_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, motto, startDate, endDate, goal, logo || null, true]
      );
      
      const programId = programResult.insertId;
      console.log(programId)
      // Insert working days
      for (const day of workingDays) {
        await connection.execute(
          'INSERT INTO program_working_days (program_id, day_of_week, is_working_day) VALUES (?, ?, ?)',
          [programId, day, true]
        );
      }
      console.log('pasamos aqui')
      // Insert non-working days
      const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const nonWorkingDays = allDays.filter(day => !workingDays.includes(day));
      
      for (const day of nonWorkingDays) { 
        await connection.execute(
          'INSERT INTO program_working_days (program_id, day_of_week, is_working_day) VALUES (?, ?, ?)',
          [programId, day, false]
        );
      }
      
      // Insert financial configuration
      await connection.execute(
        'INSERT INTO program_financial_config (program_id, colporter_percentage, leader_percentage, colporter_cash_advance_percentage, leader_cash_advance_percentage) VALUES (?, ?, ?, ?, ?)',
        [programId, colporterPercentage, leaderPercentage, colporterCashAdvancePercentage, leaderCashAdvancePercentage]
      );
      console.log('pasamos alli')
      // Insert books
      if (books && books.length > 0) {
        for (const book of books) {
          // Check if book already exists
          const [existingBooks] = await connection.execute(
            'SELECT id FROM books WHERE title = ?',
            [book.title]
          );
          
          let bookId;
          
          if (existingBooks.length > 0) {
            // Update existing book
            bookId = existingBooks[0].id;
            await connection.execute(
              'UPDATE books SET price = ?, category = ?, description = ?, image_url = ?, is_active = ? WHERE id = ?',
              [book.price, book.category, book.description, book.imageUrl || null, book.is_active, bookId]
            );
          } else {
            // console.log(book.isbn || null, book.title, book.author || null, book.publisher || null, book.price, book.category, book.description, book.imageUrl || null, book.stock, 0, book.is_active)
            // Insert new book
            const [bookResult] = await connection.execute(
              'INSERT INTO books (isbn, title, author, publisher, price, category, description, image_url, stock, sold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [book.isbn || null, book.title, book.author || null, book.publisher || null, book.price, book.category, book.description, book.imageUrl || null, book.stock, 0, book.is_active]
            );
            
            bookId = bookResult.insertId;
          }
          // Insert program book
          await connection.execute(
            'INSERT INTO program_books (program_id, book_id, price, initial_stock) VALUES (?, ?, ?, ?)',
            [programId, bookId, book.price, book.stock]
          );
        }
      }
      console.log('pasamos')
      // Insert colporters
      if (colporters && colporters.length > 0) {
        for (const colporter of colporters) {
          // Insert person
          const [personResult] = await connection.execute(
            'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, school, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [colporter.name, colporter.apellido, colporter.email, colporter.phone, colporter.address, colporter.profileImage || null, 'COLPORTER', 'ACTIVE', colporter.school, colporter.age]
          );
          
          const personId = personResult.insertId;
          
          // Create user if needed
          if (colporter.createUser) {
            const passwordHash = await bcrypt.hash(`${colporter.name.toLowerCase()}.${colporter.apellido.toLowerCase()}`, 10);
            
            await connection.execute(
              'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
              [personId, colporter.email, passwordHash, 'VIEWER', 'ACTIVE']
            );
          }
        }
      }
      console.log('leaders')
      // Insert leaders
      if (leaders && leaders.length > 0) {
        for (const leader of leaders) {
          // Insert person
          const [personResult] = await connection.execute(
            'INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [leader.name, leader.apellido, leader.email, leader.phone, leader.address, leader.profileImage || null, 'LEADER', 'ACTIVE', leader.institution]
          );
          
          const personId = personResult.insertId;
          
          // Create user if needed
          if (leader.createUser) {
            const passwordHash = await bcrypt.hash(`${leader.name.toLowerCase()}.${leader.apellido.toLowerCase()}`, 10);
            
            await connection.execute(
              'INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
              [personId, leader.email, passwordHash, 'SUPERVISOR', 'ACTIVE']
            );
          }
        }
      }
      
      return { programId };
    });

    res.status(201).json({ 
      message: 'Program created successfully', 
      programId: result.programId 
    });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get active program
export const getProgram = async (req, res) => {
  try {
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = true'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get financial config
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [program.id]
    );
    
    // Get working days
    const workingDays = await db.query(
      'SELECT * FROM program_working_days WHERE program_id = ?',
      [program.id]
    );
    
    // Get custom days
    const customDays = await db.query(
      'SELECT * FROM program_custom_days WHERE program_id = ?',
      [program.id]
    );
    
    // Get program books
    const books = await db.query(
      'SELECT * FROM view_program_books WHERE program_id = ?',
      [program.id]
    );
    
    // Create consolidated program object
    const programResponse = {
      ...program,
      financialConfig: {
        ...financialConfig
      },
      workingDays: workingDays.map(day => ({
        ...day
      })),
      customDays: customDays.map(day => ({
        ...day
      })),
      books: books.map(book => ({
        ...book
      }))
    };
    
    console.log(programResponse);
    res.json({program: programResponse});
  } catch (error) {
    console.error('Error getting program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update program
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      motto,
      startDate,
      endDate,
      goal,
      logo,
      isActive
    } = req.body;
    
    // Update program
    await db.update(
      'UPDATE programs SET name = ?, motto = ?, start_date = ?, end_date = ?, financial_goal = ?, logo_url = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [name, motto, startDate, endDate, goal, logo || null, isActive, id]
    );
    
    res.json({ message: 'Program updated successfully' });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get program working days
export const getProgramWorkingDays = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get working days
    const workingDays = await db.query(
      'SELECT * FROM program_working_days WHERE program_id = ?',
      [id]
    );
    
    // Get custom days
    const customDays = await db.query(
      'SELECT * FROM program_custom_days WHERE program_id = ?',
      [id]
    );
    
    res.json({
      workingDays,
      customDays
    });
  } catch (error) {
    console.error('Error getting program working days:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update program working day
export const updateProgramWorkingDay = async (req, res) => {
  try {
    const { id, day } = req.params;
    const { isWorkingDay } = req.body;
    
    // Update working day
    await db.update(
      'UPDATE program_working_days SET is_working_day = ? WHERE program_id = ? AND day_of_week = ?',
      [isWorkingDay, id, day]
    );
    
    res.json({ message: 'Working day updated successfully' });
  } catch (error) {
    console.error('Error updating program working day:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add custom program day
export const addCustomProgramDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, isWorkingDay } = req.body;
    
    // Check if custom day already exists
    const existingDay = await db.getOne(
      'SELECT * FROM program_custom_days WHERE program_id = ? AND date = ?',
      [id, date]
    );
    
    if (existingDay) {
      // Update existing custom day
      await db.update(
        'UPDATE program_custom_days SET is_working_day = ? WHERE program_id = ? AND date = ?',
        [isWorkingDay, id, date]
      );
    } else {
      // Insert new custom day
      await db.insert(
        'INSERT INTO program_custom_days (program_id, date, is_working_day) VALUES (?, ?, ?)',
        [id, date, isWorkingDay]
      );
    }
    
    res.json({ message: 'Custom day added successfully' });
  } catch (error) {
    console.error('Error adding custom program day:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get financial config
export const getFinancialConfig = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get financial config
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [id]
    );
    
    if (!financialConfig) {
      return res.status(404).json({ message: 'Financial configuration not found' });
    }
    
    res.json(financialConfig);
  } catch (error) {
    console.error('Error getting financial config:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update financial config
export const updateFinancialConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      colporterPercentage,
      leaderPercentage,
      colporterCashAdvancePercentage,
      leaderCashAdvancePercentage
    } = req.body;
    
    // Update financial config
    await db.update(
      'UPDATE program_financial_config SET colporter_percentage = ?, leader_percentage = ?, colporter_cash_advance_percentage = ?, leader_cash_advance_percentage = ?, updated_at = NOW() WHERE program_id = ?',
      [colporterPercentage, leaderPercentage, colporterCashAdvancePercentage, leaderCashAdvancePercentage, id]
    );
    
    res.json({ message: 'Financial configuration updated successfully' });
  } catch (error) {
    console.error('Error updating financial config:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};