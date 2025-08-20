import * as db from "../config/database.js";
import bcrypt from "bcryptjs";

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
      logo = '',
      colporterPercentage,
      leaderPercentage,
      colporterCashAdvancePercentage,
      leaderCashAdvancePercentage,
      books,
      colporters,
      leaders,
    } = req.body;

    // Start a transaction
    const result = await db.transaction(async (connection) => {
      // Insert program
      const [programResult] = await connection.execute(
        "INSERT INTO programs (name, motto, start_date, end_date, financial_goal, logo_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, motto, startDate, endDate, goal, logo, true]
      );

      const programId = programResult.insertId;

      // Insert working days
      for (const day of workingDays) {
        await connection.execute(
          "INSERT INTO program_working_days (program_id, day_of_week, is_working_day) VALUES (?, ?, ?)",
          [programId, day, true]
        );
      }

      // Insert non-working days
      const allDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const nonWorkingDays = allDays.filter(
        (day) => !workingDays.includes(day)
      );

      for (const day of nonWorkingDays) {
        await connection.execute(
          "INSERT INTO program_working_days (program_id, day_of_week, is_working_day) VALUES (?, ?, ?)",
          [programId, day, false]
        );
      }

      // Insert financial configuration
      await connection.execute(
        "INSERT INTO program_financial_config (program_id, colporter_percentage, leader_percentage, colporter_cash_advance_percentage, leader_cash_advance_percentage) VALUES (?, ?, ?, ?, ?)",
        [
          programId,
          colporterPercentage,
          leaderPercentage,
          colporterCashAdvancePercentage,
          leaderCashAdvancePercentage,
        ]
      );

      // Insert books
      if (books && books.length > 0) {
        for (const book of books) {
          // Check if book already exists
          const [existingBooks] = await connection.execute(
            "SELECT id FROM books WHERE title = ?",
            [book.title]
          );

          let bookId;

          if (existingBooks.length > 0) {
            // Use existing book
            bookId = existingBooks[0].id;
          } else {
            // Insert new book
            const [bookResult] = await connection.execute(
              "INSERT INTO books (isbn, title, author, publisher, price, size, category, description, image_url, stock, sold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                book.isbn || null,
                book.title,
                book.author || null,
                book.publisher || null,
                book.price,
                book.size,
                book.category,
                book.description,
                book.image_url || null,
                0,
                0,
                book.is_active,
              ]
            );

            bookId = bookResult.insertId;
          }

          // Insert program book
          await connection.execute(
            "INSERT INTO program_books (program_id, book_id, price, initial_stock, sold) VALUES (?, ?, ?, ?, ?)",
            [programId, bookId, book.price, book.stock, 0]
          );
        }
      }

      // Insert colporters
      if (colporters && colporters.length > 0) {
        for (const colporter of colporters) {
          // Insert person
          const [personResult] = await connection.execute(
            "INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, school, age, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              colporter.name,
              colporter.apellido,
              colporter.email,
              colporter.phone,
              colporter.address,
              colporter.profileImage || null,
              "COLPORTER",
              "ACTIVE",
              colporter.school,
              colporter.age,
              programId
            ]
          );

          const personId = personResult.insertId;

          // Create user if needed
          if (colporter.createUser) {
            const passwordHash = await bcrypt.hash(
              `${colporter.name.toLowerCase()}.${colporter.apellido.toLowerCase()}`,
              10
            );

            // Check if user already exists
            const [existingUsers] = await connection.execute(
              'SELECT id FROM users WHERE email = ?',
              [colporter.email]
            );
            
            let userId;
            
            if (existingUsers.length > 0) {
              // User exists, update person_id and add to program
              userId = existingUsers[0].id;
              
              // Update person_id
              await connection.execute(
                'UPDATE users SET person_id = ? WHERE id = ?',
                [personId, userId]
              );
            } else {
              // Create new user
              const [userResult] = await connection.execute(
                "INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                [personId, colporter.email, passwordHash, "VIEWER", "ACTIVE"]
              );
              userId = userResult.insertId;
            }
            
            // Add user to program
            await connection.execute(
              'INSERT INTO user_programs (user_id, program_id, is_current) VALUES (?, ?, ?)',
              [userId, programId, false]
            );
          }
        }
      }

      // Insert leaders
      if (leaders && leaders.length > 0) {
        for (const leader of leaders) {
          // Insert person
          const [personResult] = await connection.execute(
            "INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, institution, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              leader.name,
              leader.apellido,
              leader.email,
              leader.phone,
              leader.address,
              leader.profileImage || null,
              "LEADER",
              "ACTIVE",
              leader.institution,
              programId
            ]
          );

          const personId = personResult.insertId;

          // Create user if needed
          if (leader.createUser) {
            const passwordHash = await bcrypt.hash(
              `${leader.name.toLowerCase()}.${leader.apellido.toLowerCase()}`,
              10
            );

            // Check if user already exists
            const [existingUsers] = await connection.execute(
              'SELECT id FROM users WHERE email = ?',
              [leader.email]
            );
            
            let userId;
            
            if (existingUsers.length > 0) {
              // User exists, update person_id and add to program
              userId = existingUsers[0].id;
              
              // Update person_id
              await connection.execute(
                'UPDATE users SET person_id = ? WHERE id = ?',
                [personId, userId]
              );
            } else {
              // Create new user
              const [userResult] = await connection.execute(
                "INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                [personId, leader.email, passwordHash, "SUPERVISOR", "ACTIVE"]
              );
              userId = userResult.insertId;
            }
            
            // Add user to program
            await connection.execute(
              'INSERT INTO user_programs (user_id, program_id, is_current) VALUES (?, ?, ?)',
              [userId, programId, false]
            );
          }
        }
      }

      return { programId };
    });

    // Add the user who created the program to user_programs table
    await db.insert(
      'INSERT INTO user_programs (user_id, program_id, is_current) VALUES (?, ?, ?)',
      [req.user.id, result.programId, true]
    );

    res.status(201).json({
      message: "Program created successfully",
      programId: result.programId,
    });
  } catch (error) {
    console.error("Error creating program:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get active program
export const getProgram = async (req, res) => {
  try {
    // Get the current program for the user
    const currentUserProgram = await db.getOne(
      'SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE',
      [req.user.id]
    );
    
    const programId = currentUserProgram?.program_id;
    
    // If no current program selected, find the first available program for the user
    let program;
    if (programId) {
      // Get the specific program by ID
      program = await db.getOne(
        "SELECT * FROM programs WHERE id = ?",
        [programId]
      );
    } else {
      // Get the first available program for the user
      program = await db.getOne(
        `SELECT p.* FROM programs p
         JOIN user_programs up ON p.id = up.program_id
         WHERE up.user_id = ?
         ORDER BY p.is_active DESC, p.start_date DESC
         LIMIT 1`,
        [req.user.id]
      );
    }

    if (!program) {
      return res.status(404).json({ message: "No program found for user" });
    }

    // Get financial config
    const financialConfig = await db.getOne(
      "SELECT * FROM program_financial_config WHERE program_id = ?",
      [program.id]
    );

    // Get working days
    const workingDays = await db.query(
      "SELECT * FROM program_working_days WHERE program_id = ?",
      [program.id]
    );

    // Get custom days
    const customDays = await db.query(
      "SELECT * FROM program_custom_days WHERE program_id = ?",
      [program.id]
    );
    
    // Get program books
    const books = await db.query(
      "SELECT * FROM view_program_books WHERE program_id = ?",
      [program.id]
    );

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
    
    res.json(programResponse);
  } catch (error) {
    console.error("Error getting program:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all available programs
export const getAvailablePrograms = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get programs the user has access to through user_programs table
    // Only include programs where the user is ACTIVE
    const programs = await db.query(
      `SELECT DISTINCT p.* FROM programs p
       JOIN user_programs up ON p.id = up.program_id
       WHERE up.user_id = ? AND up.status = 'ACTIVE'
       ORDER BY p.is_active DESC, p.start_date DESC`,
      [userId]
    );

    res.json(programs);
  } catch (error) {
    console.error("Error getting available programs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Switch to a different program
export const switchProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if program exists
    const program = await db.getOne("SELECT * FROM programs WHERE id = ?", [
      id,
    ]);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    
    // Verify that the user has access to this program through user_programs
    const hasAccess = await db.getOne(
      'SELECT 1 FROM user_programs WHERE user_id = ? AND program_id = ?',
      [userId, id]
    );
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this program" });
    }

    // Update current program for user (set all to false, then set selected to true)
    await db.transaction(async (connection) => {
      // Set all programs to not current for this user
      await connection.execute(
        'UPDATE user_programs SET is_current = FALSE WHERE user_id = ?',
        [userId]
      );
      
      // Set selected program as current
      await connection.execute(
        'UPDATE user_programs SET is_current = TRUE WHERE user_id = ? AND program_id = ?',
        [userId, id]
      );
    });
    
    // Get the complete program data to return
    const updatedProgram = await db.getOne(
      "SELECT * FROM programs WHERE id = ?",
      [id]
    );

    // Get financial config
    const financialConfig = await db.getOne(
      "SELECT * FROM program_financial_config WHERE program_id = ?",
      [id]
    );

    // Get working days
    const workingDays = await db.query(
      "SELECT * FROM program_working_days WHERE program_id = ?",
      [id]
    );

    // Get custom days
    const customDays = await db.query(
      "SELECT * FROM program_custom_days WHERE program_id = ?",
      [id]
    );

    // Get program books
    const books = await db.query(
      "SELECT * FROM view_program_books WHERE program_id = ?",
      [id]
    );
    
    const programResponse = {
      ...updatedProgram,
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
    
    res.json(programResponse);
  } catch (error) {
    console.error("Error switching program:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update program
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, motto, startDate, endDate, goal, logo, isActive } = req.body;

    // Update program
    await db.update(
      "UPDATE programs SET name = ?, motto = ?, start_date = ?, end_date = ?, financial_goal = ?, logo_url = ?, is_active = ?, updated_at = NOW() WHERE id = ?",
      [name, motto, startDate, endDate, goal, logo, isActive, id]
    );

    res.json({ message: "Program updated successfully" });
  } catch (error) {
    console.error("Error updating program:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get program working days
export const getProgramWorkingDays = async (req, res) => {
  try {
    const { id } = req.params;

    // Get working days
    const workingDays = await db.query(
      "SELECT * FROM program_working_days WHERE program_id = ?",
      [id]
    );

    // Get custom days
    const customDays = await db.query(
      "SELECT * FROM program_custom_days WHERE program_id = ?",
      [id]
    );

    res.json({
      workingDays,
      customDays,
    });
  } catch (error) {
    console.error("Error getting program working days:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update program working day
export const updateProgramWorkingDay = async (req, res) => {
  try {
    const { id, day } = req.params;
    const { isWorkingDay } = req.body;

    // Update working day
    await db.update(
      "UPDATE program_working_days SET is_working_day = ? WHERE program_id = ? AND day_of_week = ?",
      [isWorkingDay, id, day]
    );

    res.json({ message: "Working day updated successfully" });
  } catch (error) {
    console.error("Error updating program working day:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add custom program day
export const addCustomProgramDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, isWorkingDay } = req.body;
    // Check if custom day already exists
    const existingDay = await db.getOne(
      "SELECT * FROM program_custom_days WHERE program_id = ? AND date = ?",
      [id, date]
    );

    if (existingDay) {
      // Update existing custom day
      await db.update(
        "UPDATE program_custom_days SET is_working_day = ? WHERE program_id = ? AND date = ?",
        [isWorkingDay, id, date]
      );
    } else {
      // Insert new custom day
      await db.insert(
        "INSERT INTO program_custom_days (program_id, date, is_working_day) VALUES (?, ?, ?)",
        [id, date, isWorkingDay]
      );
    }

    res.json({ message: "Custom day added successfully" });
  } catch (error) {
    console.error("Error adding custom program day:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get financial config
export const getFinancialConfig = async (req, res) => {
  try {
    const { id } = req.params;

    // Get financial config
    const financialConfig = await db.getOne(
      "SELECT * FROM program_financial_config WHERE program_id = ?",
      [id]
    );

    if (!financialConfig) {
      return res
        .status(404)
        .json({ message: "Financial configuration not found" });
    }

    res.json(financialConfig);
  } catch (error) {
    console.error("Error getting financial config:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update financial config
export const updateFinancialConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      colporter_percentage,
      leader_percentage,
      colporter_cash_advance_percentage,
      leader_cash_advance_percentage,
    } = req.body;

    // Update financial config
    await db.update(
      "UPDATE program_financial_config SET colporter_percentage = ?, leader_percentage = ?, colporter_cash_advance_percentage = ?, leader_cash_advance_percentage = ?, updated_at = NOW() WHERE program_id = ?",
      [
        colporter_percentage,
        leader_percentage,
        colporter_cash_advance_percentage,
        leader_cash_advance_percentage,
        id,
      ]
    );

    res.json({ message: "Financial configuration updated successfully" });
  } catch (error) {
    console.error("Error updating financial config:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  createProgram,
  getProgram,
  updateProgram,
  getProgramWorkingDays,
  updateProgramWorkingDay,
  addCustomProgramDay,
  getFinancialConfig,
  updateFinancialConfig,
  getAvailablePrograms,
  switchProgram
};