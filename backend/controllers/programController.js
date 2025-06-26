import * as db from "../config/database.js";
import bcrypt from "bcryptjs";

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

    // Validaciones básicas
    if (!name || !startDate || !endDate || !goal) {
      return res.status(400).json({ 
        message: "Missing required fields: name, startDate, endDate, goal" 
      });
    }

    const result = await db.transaction(async (connection) => {
      try {
        // 1. Verificar si el programa ya existe
        const [existingProgram] = await connection.execute(
          "SELECT id FROM programs WHERE name = ?",
          [name]
        );

        if (existingProgram.length > 0) {
          throw new Error(`Program with name '${name}' already exists`);
        }

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
        const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        const nonWorkingDays = allDays.filter(day => !workingDays.includes(day));

        for (const day of nonWorkingDays) {
          await connection.execute(
            "INSERT INTO program_working_days (program_id, day_of_week, is_working_day) VALUES (?, ?, ?)",
            [programId, day, false]
          );
        }

        // Insert financial configuration
        await connection.execute(
          "INSERT INTO program_financial_config (program_id, colporter_percentage, leader_percentage, colporter_cash_advance_percentage, leader_cash_advance_percentage) VALUES (?, ?, ?, ?, ?)",
          [programId, colporterPercentage, leaderPercentage, colporterCashAdvancePercentage, leaderCashAdvancePercentage]
        );

        // Insert books
        if (books && books.length > 0) {
          for (const book of books) {
            const [existingBooks] = await connection.execute(
              "SELECT id FROM books WHERE title = ?",
              [book.title]
            );

            let bookId;
            if (existingBooks.length > 0) {
              bookId = existingBooks[0].id;
              await connection.execute(
                "UPDATE books SET price = ?, category = ?, description = ?, image_url = ?, is_active = ? WHERE id = ?",
                [book.price, book.category, book.description, book.image_url, book.is_active, bookId]
              );
            } else {
              const [bookResult] = await connection.execute(
                "INSERT INTO books (isbn, title, author, publisher, price, size, category, description, image_url, stock, sold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [book.isbn || null, book.title, book.author || null, book.publisher || null, book.price, book.size, book.category, book.description, book.image_url || null, book.stock, 0, book.is_active]
              );
              bookId = bookResult.insertId;
            }

            await connection.execute(
              "INSERT INTO program_books (program_id, book_id, price, initial_stock) VALUES (?, ?, ?, ?)",
              [programId, bookId, book.price, book.stock]
            );
          }
        }

        // Insert colporters - CON ROLLBACK COMPLETO EN DUPLICADOS
        if (colporters && colporters.length > 0) {
          for (const colporter of colporters) {
            // Verificar duplicados por email en este programa
            const [existingColporters] = await connection.execute(
              "SELECT id FROM people WHERE email = ? AND program_id = ? AND person_type = 'COLPORTER'",
              [colporter.email, programId]
            );

            if (existingColporters.length > 0) {
              // LANZAR ERROR PARA CAUSAR ROLLBACK COMPLETO
              throw new Error(`Colporter with email '${colporter.email}' already exists in this program`);
            }

            // Verificar duplicados por email globalmente (opcional - más estricto)
            const [globalExistingColporters] = await connection.execute(
              "SELECT id FROM people WHERE email = ? AND person_type = 'COLPORTER'",
              [colporter.email]
            );

            if (globalExistingColporters.length > 0) {
              throw new Error(`Colporter with email '${colporter.email}' already exists in the system`);
            }

            // Insert person
            const [personResult] = await connection.execute(
              "INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, school, age, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [colporter.name, colporter.apellido, colporter.email, colporter.phone, colporter.address, colporter.profileImage || null, "COLPORTER", "ACTIVE", colporter.school, colporter.age, programId]
            );

            const personId = personResult.insertId;

            // Create user if needed
            if (colporter.createUser) {
              // Verificar si el usuario ya existe
              const [existingUser] = await connection.execute(
                "SELECT id FROM users WHERE email = ?",
                [colporter.email]
              );

              if (existingUser.length > 0) {
                throw new Error(`User with email '${colporter.email}' already exists`);
              }

              const passwordHash = await bcrypt.hash(
                `${colporter.name.toLowerCase()}.${colporter.apellido.toLowerCase()}`,
                10
              );

              await connection.execute(
                "INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                [personId, colporter.email, passwordHash, "VIEWER", "ACTIVE"]
              );
            }
          }
        }

        // Insert leaders - CON ROLLBACK COMPLETO EN DUPLICADOS
        if (leaders && leaders.length > 0) {
          for (const leader of leaders) {
            // Verificar duplicados por email en este programa
            const [existingLeaders] = await connection.execute(
              "SELECT id FROM people WHERE email = ? AND program_id = ? AND person_type = 'LEADER'",
              [leader.email, programId]
            );

            if (existingLeaders.length > 0) {
              // LANZAR ERROR PARA CAUSAR ROLLBACK COMPLETO
              throw new Error(`Leader with email '${leader.email}' already exists in this program`);
            }

            // Verificar duplicados por email globalmente (opcional - más estricto)
            const [globalExistingLeaders] = await connection.execute(
              "SELECT id FROM people WHERE email = ? AND person_type = 'LEADER'",
              [leader.email]
            );

            if (globalExistingLeaders.length > 0) {
              throw new Error(`Leader with email '${leader.email}' already exists in the system`);
            }

            // Insert person
            const [personResult] = await connection.execute(
              "INSERT INTO people (first_name, last_name, email, phone, address, profile_image_url, person_type, status, institution, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [leader.name, leader.apellido, leader.email, leader.phone, leader.address, leader.profileImage || null, "LEADER", "ACTIVE", leader.institution, programId]
            );

            const personId = personResult.insertId;

            // Create user if needed
            if (leader.createUser) {
              // Verificar si el usuario ya existe
              const [existingUser] = await connection.execute(
                "SELECT id FROM users WHERE email = ?",
                [leader.email]
              );

              if (existingUser.length > 0) {
                throw new Error(`User with email '${leader.email}' already exists`);
              }

              const passwordHash = await bcrypt.hash(
                `${leader.name.toLowerCase()}.${leader.apellido.toLowerCase()}`,
                10
              );

              await connection.execute(
                "INSERT INTO users (person_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                [personId, leader.email, passwordHash, "SUPERVISOR", "ACTIVE"]
              );
            }
          }
        }

        return { programId };

      } catch (transactionError) {
        console.error("Error within transaction:", transactionError);
        // Re-lanzar el error para que la transacción haga rollback automáticamente
        throw transactionError;
      }
    });

    res.status(201).json({
      message: "Program created successfully",
      programId: result.programId,
    });

  } catch (error) {
    console.error("Error creating program:", error);
    
    // Manejo específico de errores de duplicados
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        message: "Duplicate entry detected - Check if you are trying to create a person with the same email as an existing person in other program.", 
        error: error.message,
        details: "All changes have been reverted due to duplicate data"
      });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: "Duplicate entry detected - Check if you are trying to create a person with the same email as an existing person in other program",
        error: error.message,
        details: "All changes have been reverted due to database constraint violation"
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        message: "Referenced record does not exist - transaction rolled back", 
        error: error.message,
        details: "All changes have been reverted due to foreign key constraint"
      });
    }

    res.status(500).json({ 
      message: "Internal server error - transaction rolled back", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      details: "All changes have been reverted"
    });
  }
};

// Get active program
export const getProgram = async (req, res) => {
  try {
    const program = await db.getOne(
      "SELECT * FROM programs WHERE is_active = true"
    );

    if (!program) {
      return res.status(404).json({ message: "No active program found" });
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
    // Get user ID from the authenticated request
    const userId = req.user.id;

    // For admin users, get all programs
    // For other users, get only the active program
    let programs;

    if (req.user.role === "ADMIN") {
      programs = await db.query(
        "SELECT * FROM programs ORDER BY is_active DESC, start_date DESC"
      );
    } else {
      programs = await db.query(
        "SELECT * FROM programs WHERE is_active = true"
      );
    }

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
    
    // Only admin users can switch programs
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only administrators can switch programs" });
    }

    // Check if program exists
    const program = await db.getOne("SELECT * FROM programs WHERE id = ?", [
      id,
    ]);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

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
      console.log("custom day updated");
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
      colporterPercentage,
      leaderPercentage,
      colporterCashAdvancePercentage,
      leaderCashAdvancePercentage,
    } = req.body;

    // Update financial config
    await db.update(
      "UPDATE program_financial_config SET colporter_percentage = ?, leader_percentage = ?, colporter_cash_advance_percentage = ?, leader_cash_advance_percentage = ?, updated_at = NOW() WHERE program_id = ?",
      [
        colporterPercentage,
        leaderPercentage,
        colporterCashAdvancePercentage,
        leaderCashAdvancePercentage,
        id,
      ]
    );

    res.json({ message: "Financial configuration updated successfully" });
  } catch (error) {
    console.error("Error updating financial config:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};