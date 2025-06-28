import * as db from '../config/database.js';

// Get all books
export const getBooks = async (req, res) => {
  try {
    const { active, category, programId } = req.query;
    
    let query = 'SELECT * FROM books';
    const params = [];
    
    // Add filters
    const conditions = [];
    
    if (active !== undefined) {
      conditions.push('is_active = ?');
      params.push(active === 'true' ? 1 : 0);
    }
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    // Add program filter through program_books table if programId is provided
    if (programId) {
      conditions.push('id IN (SELECT book_id FROM program_books WHERE program_id = ?)');
      params.push(programId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY title ASC';
    
    const books = await db.query(query, params);
    
    // If programId is provided, get program-specific book data
    if (programId) {
      const programBooks = await db.query(
        `SELECT pb.book_id, pb.price, pb.initial_stock, COALESCE(pb.sold, 0) as sold 
         FROM program_books pb 
         WHERE pb.program_id = ?`,
        [programId]
      );
      
      // Create a map of program book data
      const programBookMap = new Map();
      programBooks.forEach(pb => {
        programBookMap.set(pb.book_id, pb);
      });
      
      // Merge program-specific data with book data
      books.forEach(book => {
        const programBook = programBookMap.get(book.id);
        if (programBook) {
          book.price = programBook.price;
          book.stock = programBook.initial_stock;
          book.sold = programBook.sold;
        }
      });
    }
    
    res.json(books);
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get book by ID
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const { programId } = req.query;
    
    const book = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // If programId is provided, get program-specific book data
    if (programId) {
      const programBook = await db.getOne(
        `SELECT pb.price, pb.initial_stock, COALESCE(pb.sold, 0) as sold 
         FROM program_books pb 
         WHERE pb.program_id = ? AND pb.book_id = ?`,
        [programId, id]
      );
      
      if (programBook) {
        book.price = programBook.price;
        book.stock = programBook.initial_stock;
        book.sold = programBook.sold;
      }
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error getting book:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new book
export const createBook = async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      publisher,
      price,
      size,
      category,
      description,
      imageUrl,
      stock,
      is_active,
      programId
    } = req.body;
    
    // Validate required fields
    if (!title || !price || !category) {
      return res.status(400).json({ message: 'Title, price, and category are required' });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert book
      const [bookResult] = await connection.execute(
        'INSERT INTO books (isbn, title, author, publisher, price, size, category, description, image_url, stock, sold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [isbn || null, title, author || null, publisher || null, price, size || (price >= 20 ? 'LARGE' : 'SMALL'), category, description, imageUrl || null, 0, 0, is_active !== false]
      );
      
      const bookId = bookResult.insertId;
      
      // If programId is provided, add to program_books
      if (programId) {
        await connection.execute(
          'INSERT INTO program_books (program_id, book_id, price, initial_stock, sold) VALUES (?, ?, ?, ?, ?)',
          [programId, bookId, price, stock || 0, 0]
        );
      }
      
      return { bookId };
    });
    
    // Get the created book
    const book = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [result.bookId]
    );
    
    // If programId was provided, update the book with program-specific data
    if (programId) {
      const programBook = await db.getOne(
        `SELECT pb.price, pb.initial_stock, COALESCE(pb.sold, 0) as sold 
         FROM program_books pb 
         WHERE pb.program_id = ? AND pb.book_id = ?`,
        [programId, result.bookId]
      );
      
      if (programBook) {
        book.price = programBook.price;
        book.stock = programBook.initial_stock;
        book.sold = programBook.sold;
      }
    }
    
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      isbn,
      title,
      author,
      publisher,
      price,
      size,
      category,
      description,
      imageUrl,
      stock,
      is_active,
      programId
    } = req.body;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Update book
      await connection.execute(
        'UPDATE books SET isbn = ?, title = ?, author = ?, publisher = ?, price = ?, size = ?, category = ?, description = ?, image_url = ?, is_active = ? WHERE id = ?',
        [isbn || null, title, author || null, publisher || null, price, size || (price >= 20 ? 'LARGE' : 'SMALL'), category, description, imageUrl || null, is_active !== false, id]
      );
      
      // If programId is provided, update program_books
      if (programId) {
        // Check if book is already in program
        const [programBooks] = await connection.execute(
          'SELECT * FROM program_books WHERE program_id = ? AND book_id = ?',
          [programId, id]
        );
        
        if (programBooks.length > 0) {
          // Update existing program book
          await connection.execute(
            'UPDATE program_books SET price = ?, initial_stock = ? WHERE program_id = ? AND book_id = ?',
            [price, stock !== undefined ? stock : programBooks[0].initial_stock, programId, id]
          );
        } else {
          // Add book to program
          await connection.execute(
            'INSERT INTO program_books (program_id, book_id, price, initial_stock, sold) VALUES (?, ?, ?, ?, 0)',
            [programId, id, price, stock || 0]
          );
        }
      }
    });
    
    // Get the updated book
    const updatedBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    // If programId was provided, update the book with program-specific data
    if (programId) {
      const programBook = await db.getOne(
        `SELECT pb.price, pb.initial_stock, COALESCE(pb.sold, 0) as sold 
         FROM program_books pb 
         WHERE pb.program_id = ? AND pb.book_id = ?`,
        [programId, id]
      );
      
      if (programBook) {
        updatedBook.price = programBook.price;
        updatedBook.stock = programBook.initial_stock;
        updatedBook.sold = programBook.sold;
      }
    }
    
    res.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete book
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if book is used in transactions
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transaction_books WHERE book_id = ?',
      [id]
    );
    
    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete book that is used in transactions. Consider deactivating it instead.' 
      });
    }
    
    // Delete book
    await db.remove(
      'DELETE FROM books WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle book status
export const toggleBookStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Toggle status
    const newStatus = !existingBook.is_active;
    
    await db.update(
      'UPDATE books SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );
    
    res.json({ 
      message: `Book ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Error toggling book status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get inventory movements
export const getInventoryMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const { programId } = req.query;
    
    let query = `SELECT m.*, u.email as user_email, 
       CONCAT(p.first_name, ' ', p.last_name) as user_name
       FROM inventory_movements m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN people p ON u.person_id = p.id
       WHERE m.book_id = ?`;
    
    const params = [id];
    
    if (programId) {
      query += ' AND m.program_id = ?';
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      query += ' AND m.program_id = ?';
      params.push(req.user.currentProgramId);
    }
    
    query += ' ORDER BY m.movement_date DESC';
    
    const movements = await db.query(query, params);
    
    res.json(movements);
  } catch (error) {
    console.error('Error getting inventory movements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create inventory movement
export const createInventoryMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, movementType, notes, programId } = req.body;
    const userId = req.user.id;
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Insert movement
      const [result] = await connection.execute(
        'INSERT INTO inventory_movements (book_id, user_id, quantity, movement_type, notes, program_id) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, quantity, movementType, notes || null, currentProgramId]
      );
      
      // Check if book exists in program_books
      const [programBooks] = await connection.execute(
        'SELECT * FROM program_books WHERE program_id = ? AND book_id = ?',
        [currentProgramId, id]
      );
      
      if (programBooks.length > 0) {
        // Update stock in program_books based on movement type
        let stockChange = 0;
        
        switch (movementType) {
          case 'IN':
            stockChange = quantity;
            break;
          case 'OUT':
            stockChange = -quantity;
            break;
          case 'SALE':
            stockChange = -quantity;
            break;
          case 'RETURN':
            stockChange = quantity;
            break;
        }
        
        // Update program_books stock
        await connection.execute(
          'UPDATE program_books SET initial_stock = GREATEST(0, initial_stock + ?) WHERE program_id = ? AND book_id = ?',
          [stockChange, currentProgramId, id]
        );
      } else {
        // Create new program_books entry
        let initialStock = 0;
        
        switch (movementType) {
          case 'IN':
          case 'RETURN':
            initialStock = quantity;
            break;
        }
        
        await connection.execute(
          'INSERT INTO program_books (program_id, book_id, price, initial_stock, sold) VALUES (?, ?, ?, ?, 0)',
          [currentProgramId, id, existingBook.price, initialStock]
        );
      }
    });
    
    // Get updated book with program-specific data
    const updatedBook = await db.getOne(
      `SELECT b.*, 
       COALESCE(pb.price, b.price) as price,
       COALESCE(pb.initial_stock, 0) as stock,
       COALESCE(pb.sold, 0) as sold
       FROM books b
       LEFT JOIN program_books pb ON b.id = pb.book_id AND pb.program_id = ?
       WHERE b.id = ?`,
      [currentProgramId, id]
    );
    
    res.status(201).json({
      message: 'Inventory movement created successfully',
      book: updatedBook
    });
  } catch (error) {
    console.error('Error creating inventory movement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get inventory counts
export const getInventoryCounts = async (req, res) => {
  try {
    const { date } = req.params;
    const { programId } = req.query;
    
    let query = `
      SELECT ic.*, 
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      b.title as book_title,
      b.size as book_size,
      CASE 
        WHEN ic.manual_count IS NOT NULL AND ic.manual_count = ic.system_count THEN 'VERIFIED'
        WHEN ic.manual_count IS NOT NULL AND ic.manual_count != ic.system_count THEN 'DISCREPANCY'
        ELSE 'PENDING'
      END as status
      FROM inventory_counts ic
      JOIN users u ON ic.user_id = u.id
      LEFT JOIN people p ON u.person_id = p.id
      JOIN books b ON ic.book_id = b.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (date) {
      conditions.push('ic.count_date = ?');
      params.push(date);
    }
    
    if (programId) {
      conditions.push('ic.program_id = ?');
      params.push(programId);
    } else if (req.user && req.user.currentProgramId) {
      conditions.push('ic.program_id = ?');
      params.push(req.user.currentProgramId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY ic.count_date DESC, b.title ASC';
    
    const counts = await db.query(query, params);
    res.json(counts);
  } catch (error) {
    console.error('Error getting inventory counts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update inventory count
export const updateInventoryCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { manualCount, countDate, confirmDiscrepancy, setVerified, programId } = req.body;
    const userId = req.user.id;
    const currentProgramId = programId || req.user.currentProgramId;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Get program-specific book data
    const programBook = await db.getOne(
      `SELECT pb.initial_stock, COALESCE(pb.sold, 0) as sold 
       FROM program_books pb 
       WHERE pb.program_id = ? AND pb.book_id = ?`,
      [currentProgramId, id]
    );
    
    // Calculate system count (current stock)
    const systemCount = programBook ? programBook.initial_stock : 0;
    
    // Calculate discrepancy
    const discrepancy = manualCount - systemCount;
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Check if count already exists for this date
      const [existingCounts] = await connection.execute(
        'SELECT * FROM inventory_counts WHERE book_id = ? AND count_date = ? AND program_id = ?',
        [id, countDate, currentProgramId]
      );
      
      // Determine the status to save
      let status = null;
      if (setVerified) {
        status = 'VERIFIED'; // Force verified status if requested
      } else if (manualCount === systemCount) {
        status = 'VERIFIED';
      } else if (manualCount !== null) {
        status = 'DISCREPANCY';
      } else {
        status = 'PENDING';
      }
      
      if (existingCounts.length > 0) {
        // Update existing count
        await connection.execute(
          'UPDATE inventory_counts SET manual_count = ?, discrepancy = ?, user_id = ?, status = ?, updated_at = NOW() WHERE id = ?',
          [manualCount, discrepancy, userId, status, existingCounts[0].id]
        );
      } else {
        // Insert new count
        await connection.execute(
          'INSERT INTO inventory_counts (book_id, user_id, system_count, manual_count, discrepancy, count_date, status, program_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, userId, systemCount, manualCount, discrepancy, countDate, status, currentProgramId]
        );
      }
      
      // If confirming discrepancy, update book stock to match manual count
      if (confirmDiscrepancy) {
        // Check if book exists in program_books
        if (programBook) {
          // Update existing program book
          await connection.execute(
            'UPDATE program_books SET initial_stock = ? WHERE program_id = ? AND book_id = ?',
            [manualCount, currentProgramId, id]
          );
        } else {
          // Create new program book entry
          await connection.execute(
            'INSERT INTO program_books (program_id, book_id, price, initial_stock, sold) VALUES (?, ?, ?, ?, 0)',
            [currentProgramId, id, existingBook.price, manualCount]
          );
        }
        
        const movementType = discrepancy > 0 ? 'IN' : 'OUT';
        const movementQuantity = Math.abs(discrepancy);
        
        if (movementQuantity > 0) {
          await connection.execute(
            'INSERT INTO inventory_movements (book_id, user_id, quantity, movement_type, notes, program_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, movementQuantity, movementType, `Inventory adjustment from count on ${countDate}`, currentProgramId]
          );
        }
      }
    });
    
    // Get updated count
    const updatedCount = await db.getOne(
      `SELECT ic.*, 
       CONCAT(p.first_name, ' ', p.last_name) as user_name,
       b.title as book_title,
       b.size as book_size
       FROM inventory_counts ic
       JOIN users u ON ic.user_id = u.id
       LEFT JOIN people p ON u.person_id = p.id
       JOIN books b ON ic.book_id = b.id
       WHERE ic.book_id = ? AND ic.count_date = ? AND ic.program_id = ?`,
      [id, countDate, currentProgramId]
    );
    
    // Get updated book if discrepancy was confirmed
    let updatedBook = null;
    if (confirmDiscrepancy) {
      updatedBook = await db.getOne(
        `SELECT b.*, 
         COALESCE(pb.price, b.price) as price,
         COALESCE(pb.initial_stock, 0) as stock,
         COALESCE(pb.sold, 0) as sold
         FROM books b
         LEFT JOIN program_books pb ON b.id = pb.book_id AND pb.program_id = ?
         WHERE b.id = ?`,
        [currentProgramId, id]
      );
    }
    
    res.json({
      message: confirmDiscrepancy ? 'Inventory count updated and stock adjusted' : 'Inventory count updated',
      count: updatedCount,
      book: updatedBook
    });
  } catch (error) {
    console.error('Error updating inventory count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  toggleBookStatus,
  getInventoryMovements,
  createInventoryMovement,
  getInventoryCounts,
  updateInventoryCount
};