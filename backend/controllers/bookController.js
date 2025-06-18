import * as db from '../config/database.js';

// Get all books
export const getBooks = async (req, res) => {
  try {
    const { active, category } = req.query;
    
    let query = 'SELECT * FROM books';
    const params = [];
    
    // Add filters
    if (active !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(active === 'true' ? 1 : 0);
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
    } else if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY title ASC';
    
    const books = await db.query(query, params);
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
    
    const book = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
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
      is_active
    } = req.body;
    
    // Validate required fields
    if (!title || !price || !category) {
      return res.status(400).json({ message: 'Title, price, and category are required' });
    }
    
    // Insert book
    const bookId = await db.insert(
      'INSERT INTO books (isbn, title, author, publisher, price, size, category, description, image_url, stock, sold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [isbn || null, title, author || null, publisher || null, price, size || null, category, description, imageUrl || null, stock || 0, 0, is_active !== false]
    );
    
    // Get the created book
    const book = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [bookId]
    );
    
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
      is_active
    } = req.body;
    
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Update book
    await db.update(
      'UPDATE books SET isbn = ?, title = ?, author = ?, publisher = ?, price = ?, size = ?, category = ?, description = ?, image_url = ?, stock = ?, is_active = ? WHERE id = ?',
      [isbn || null, title, author || null, publisher || null, price, size || null, category, description, imageUrl || null, stock, is_active !== false, id]
    );
    
    // Get the updated book
    const updatedBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
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
    
    const movements = await db.query(
      `SELECT m.*, u.email as user_email, 
       CONCAT(p.first_name, ' ', p.last_name) as user_name
       FROM inventory_movements m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN people p ON u.person_id = p.id
       WHERE m.book_id = ?
       ORDER BY m.movement_date DESC`,
      [id]
    );
    
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
    const { quantity, movementType, notes } = req.body;
    const userId = req.user.id;
    
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
        'INSERT INTO inventory_movements (book_id, user_id, quantity, movement_type, notes) VALUES (?, ?, ?, ?, ?)',
        [id, userId, quantity, movementType, notes || null]
      );
      
      // Update book stock based on movement type
      let stockChange = 0;
      let soldChange = 0;
      
      switch (movementType) {
        case 'IN':
          stockChange = quantity;
          break;
        case 'OUT':
          stockChange = -quantity;
          break;
        case 'SALE':
          stockChange = -quantity;
          soldChange = quantity;
          break;
        case 'RETURN':
          stockChange = quantity;
          soldChange = -quantity;
          break;
      }
      
      // Update book stock and sold
      await connection.execute(
        'UPDATE books SET stock = stock + ?, sold = sold + ? WHERE id = ?',
        [stockChange, soldChange, id]
      );
    });
    
    // Get updated book
    const updatedBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
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
    
    if (date) {
      query += ' WHERE ic.count_date = ?';
      params.push(date);
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
    const { manualCount, countDate, confirmDiscrepancy, setVerified } = req.body;
    const userId = req.user.id;
    // Check if book exists
    const existingBook = await db.getOne(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    // Calculate system count (current stock)
    const systemCount = existingBook.stock;
    
    // Calculate discrepancy
    const discrepancy = manualCount - systemCount;
    
    // Start transaction
    await db.transaction(async (connection) => {
      // Check if count already exists for this date
      const [existingCounts] = await connection.execute(
        'SELECT * FROM inventory_counts WHERE book_id = ? AND count_date = ?',
        [id, countDate]
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
          'INSERT INTO inventory_counts (book_id, user_id, system_count, manual_count, discrepancy, count_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, userId, systemCount, manualCount, discrepancy, countDate, status]
        );
      }
      
      // If confirming discrepancy, update book stock to match manual count
      if (confirmDiscrepancy) {
        await connection.execute(
          'UPDATE books SET stock = ? WHERE id = ?',
          [manualCount, id]
        );
        
        const movementType = discrepancy > 0 ? 'IN' : 'OUT';
        const movementQuantity = Math.abs(discrepancy);
        
        if (movementQuantity > 0) {
          await connection.execute(
            'INSERT INTO inventory_movements (book_id, user_id, quantity, movement_type, notes) VALUES (?, ?, ?, ?, ?)',
            [id, userId, movementQuantity, movementType, `Inventory adjustment from count on ${countDate}`]
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
       WHERE ic.book_id = ? AND ic.count_date = ?`,
      [id, countDate]
    );
    
    // Get updated book if discrepancy was confirmed
    let updatedBook = null;
    if (confirmDiscrepancy) {
      updatedBook = await db.getOne(
        'SELECT * FROM books WHERE id = ?',
        [id]
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