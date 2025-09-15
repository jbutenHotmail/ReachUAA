import * as db from '../config/database.js';

// Get achievements for different categories
export const getAchievements = async (req, res) => {
  try {
    const { category, programId, book_category, book_size, person_type } = req.query;
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Require programId to be explicitly provided
    if (!programId) {
      return res.status(400).json({ 
        message: 'Program ID is required. Please select a program.' 
      });
    }

    // Validate that the program exists and get program dates
    const program = await db.getOne(
      'SELECT id, name, start_date, end_date FROM programs WHERE id = ?',
      [programId]
    );

    if (!program) {
      return res.status(404).json({ 
        message: 'Program not found. Please select a valid program.' 
      });
    }

    // Validate category
    const validCategories = [
      'donations', 
      'books_total',
      'books_category',
      'bible_studies'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid achievement category' });
    }

    let query = '';
    let params = [];

    switch (category) {
      case 'donations':
        // Validate person_type is required and valid
        if (!person_type || !['colporter', 'leader'].includes(person_type)) {
          return res.status(400).json({ 
            message: 'Person type is required for donations. Must be "colporter" or "leader".' 
          });
        }

        if (person_type === 'colporter') {
          // Top colporters by total donations for specific program
          query = `
            SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as name,
              p.person_type,
              ? as person_type_filter,
              COALESCE(SUM(t.total), 0) as total_donations,
              COUNT(t.id) as transaction_count,
              RANK() OVER (ORDER BY COALESCE(SUM(t.total), 0) DESC) as achievement_rank
            FROM people p
            LEFT JOIN transactions t ON p.id = t.student_id 
              AND t.status = 'APPROVED'
              AND t.transaction_date >= ?
              AND t.transaction_date <= ?
              AND t.program_id = ?
            WHERE p.person_type = 'COLPORTER'
              AND p.status = 'ACTIVE'
              AND p.program_id = ?
            GROUP BY p.id, p.first_name, p.last_name, p.person_type
            ORDER BY total_donations DESC
            LIMIT 10
          `;
          params = [
            person_type,
            program.start_date, 
            program.end_date, 
            program.id, 
            program.id
          ];
        } else if (person_type === 'leader') {
          // Top leaders by total donations (using leader_id from transactions)
          query = `
            SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as name,
              p.person_type,
              ? as person_type_filter,
              COALESCE(SUM(t.total), 0) as total_donations,
              COUNT(t.id) as transaction_count,
              RANK() OVER (ORDER BY COALESCE(SUM(t.total), 0) DESC) as achievement_rank
            FROM people p
            LEFT JOIN transactions t ON p.id = t.leader_id 
              AND t.status = 'APPROVED'
              AND t.transaction_date >= ?
              AND t.transaction_date <= ?
              AND t.program_id = ?
            WHERE p.person_type = 'LEADER'
              AND p.status = 'ACTIVE'
              AND p.program_id = ?
            GROUP BY p.id, p.first_name, p.last_name, p.person_type
            ORDER BY total_donations DESC
            LIMIT 10
          `;
          params = [
            person_type,
            program.start_date, 
            program.end_date, 
            program.id, 
            program.id
          ];
        }
        break;

      case 'books_total':
        // Build conditions for book size filtering
        let bookSizeConditions = [];
        let bookSizeParams = [];
        
        if (book_size && book_size !== 'todos') {
          bookSizeConditions.push('b.size = ?');
          bookSizeParams.push(book_size.toUpperCase());
        }
        
        const bookSizeWhereClause = bookSizeConditions.length > 0 ? 
          `AND ${bookSizeConditions.join(' AND ')}` : '';

        // Top colporters by total books sold for specific program (with optional size filtering)
        query = `
          SELECT 
            p.id,
            CONCAT(p.first_name, ' ', p.last_name) as name,
            p.person_type,
            ? as size_filter,
            COALESCE(SUM(tb.quantity), 0) as total_books,
            COALESCE(SUM(tb.quantity * tb.price), 0) as total_book_value,
            RANK() OVER (ORDER BY COALESCE(SUM(tb.quantity), 0) DESC) as achievement_rank
          FROM people p
          LEFT JOIN transactions t ON p.id = t.student_id 
            AND t.status = 'APPROVED'
            AND t.transaction_date >= ?
            AND t.transaction_date <= ?
            AND t.program_id = ?
          LEFT JOIN transaction_books tb ON t.id = tb.transaction_id
          LEFT JOIN books b ON tb.book_id = b.id
          WHERE p.person_type = 'COLPORTER' 
            AND p.status = 'ACTIVE'
            AND p.program_id = ?
            ${bookSizeWhereClause}
          GROUP BY p.id, p.first_name, p.last_name, p.person_type
          ORDER BY total_books DESC
          LIMIT 10
        `;
        params = [
          book_size || 'todos',
          program.start_date, 
          program.end_date,
          program.id,
          program.id,
          ...bookSizeParams
        ];
        break;

      case 'books_category':
        // Build conditions for book category filtering
        let bookConditions = [];
        let bookParams = [];
        
        if (book_category) {
          bookConditions.push('b.category = ?');
          bookParams.push(book_category);
          // Exclude small books for specific category
          bookConditions.push('b.size != ?');
          bookParams.push('SMALL');
        }
        
        const bookWhereClause = bookConditions.length > 0 ? 
          `AND ${bookConditions.join(' AND ')}` : '';

        if (book_category) {
          // Top colporters by specific book category for specific program, excluding small books
          query = `
            SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as name,
              p.person_type,
              ? as category,
              COALESCE(SUM(tb.quantity), 0) as total_category_books,
              COALESCE(SUM(tb.quantity * tb.price), 0) as total_category_value,
              RANK() OVER (ORDER BY COALESCE(SUM(tb.quantity), 0) DESC) as achievement_rank
            FROM people p
            LEFT JOIN transactions t ON p.id = t.student_id 
              AND t.status = 'APPROVED'
              AND t.transaction_date >= ?
              AND t.transaction_date <= ?
              AND t.program_id = ?
            LEFT JOIN transaction_books tb ON t.id = tb.transaction_id
            LEFT JOIN books b ON tb.book_id = b.id
            WHERE p.person_type = 'COLPORTER' 
              AND p.status = 'ACTIVE'
              AND p.program_id = ?
              ${bookWhereClause}
            GROUP BY p.id, p.first_name, p.last_name, p.person_type
            HAVING total_category_books > 0
            ORDER BY total_category_books DESC
            LIMIT 10
          `;
          params = [
            book_category,
            program.start_date, 
            program.end_date,
            program.id,
            program.id,
            ...bookParams
          ];
        } else {
          // Top performers by each category for specific program
          query = `
            SELECT 
              id,
              name,
              person_type,
              category,
              total_category_books,
              total_category_value,
              achievement_rank
            FROM (
              SELECT 
                p.id,
                CONCAT(p.first_name, ' ', p.last_name) as name,
                p.person_type,
                b.category,
                COALESCE(SUM(tb.quantity), 0) as total_category_books,
                COALESCE(SUM(tb.quantity * tb.price), 0) as total_category_value,
                ROW_NUMBER() OVER (PARTITION BY b.category ORDER BY COALESCE(SUM(tb.quantity), 0) DESC) as achievement_rank
              FROM people p
              LEFT JOIN transactions t ON p.id = t.student_id 
                AND t.status = 'APPROVED'
                AND t.transaction_date >= ?
                AND t.transaction_date <= ?
                AND t.program_id = ?
              LEFT JOIN transaction_books tb ON t.id = tb.transaction_id
              LEFT JOIN books b ON tb.book_id = b.id
              WHERE p.person_type = 'COLPORTER' 
                AND p.status = 'ACTIVE' 
                AND p.program_id = ?
                AND b.category IS NOT NULL
              GROUP BY p.id, p.first_name, p.last_name, p.person_type, b.category
              HAVING total_category_books > 0
            ) ranked
            WHERE achievement_rank <= 3
            ORDER BY category, total_category_books DESC
            LIMIT 30
          `;
          params = [program.start_date, program.end_date, program.id, program.id];
        }
        break;

      case 'bible_studies':
        // Top colporters by total bible studies created for specific program
        query = `
          SELECT 
            p.id,
            CONCAT(p.first_name, ' ', p.last_name) as name,
            p.person_type,
            COUNT(bs.id) as total_bible_studies,
            COUNT(DISTINCT bs.study_type) as study_types_count,
            RANK() OVER (ORDER BY COUNT(bs.id) DESC) as achievement_rank
          FROM people p
          LEFT JOIN bible_studies bs ON p.id = bs.colporter_id 
            AND bs.program_id = ?
            AND bs.created_at >= ?
            AND bs.created_at <= DATE_ADD(?, INTERVAL 1 DAY)
          WHERE p.person_type = 'COLPORTER' 
            AND p.status = 'ACTIVE'
            AND p.program_id = ?
          GROUP BY p.id, p.first_name, p.last_name, p.person_type
          ORDER BY total_bible_studies DESC
          LIMIT 10
        `;
        params = [program.id, program.start_date, program.end_date, program.id];
        break;
    }
    
    const achievements = await db.query(query, params);

    // Sanitize response to remove 'size' field if present (for books_category)
    const sanitizedAchievements = achievements.map(ach => {
      const { size, ...rest } = ach;
      return rest;
    });

    res.json(sanitizedAchievements);
  } catch (error) {
    console.error('Error getting achievements:', {
      message: error.message,
      programId: req.query.programId,
      category: req.query.category,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all book categories
export const getBookCategories = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category 
      FROM books 
      WHERE category IS NOT NULL AND category != '' AND is_active = TRUE
      ORDER BY category
    `;
    
    const categories = await db.query(query);
    const categoryList = categories.map(cat => cat.category);
    
    res.json(categoryList);
  } catch (error) {
    console.error('Error getting book categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get program statistics for achievements context
export const getProgramStats = async (req, res) => {
  try {
    const { programId } = req.query;
    
    // Require programId to be explicitly provided
    if (!programId) {
      return res.status(400).json({ 
        message: 'Program ID is required. Please select a program.' 
      });
    }

    // Validate that the program exists
    const program = await db.getOne(
      'SELECT id, name, start_date, end_date, financial_goal FROM programs WHERE id = ?',
      [programId]
    );

    if (!program) {
      return res.status(404).json({ 
        message: 'Program not found. Please select a valid program.' 
      });
    }

    // Get overall statistics for the specific program
    const stats = await db.getOne(`
      SELECT 
        COUNT(DISTINCT CASE WHEN p.person_type = 'COLPORTER' THEN p.id END) as total_colporters,
        COUNT(DISTINCT CASE WHEN p.person_type = 'LEADER' THEN p.id END) as total_leaders,
        COALESCE(SUM(CASE WHEN t.student_id IS NOT NULL THEN t.total ELSE 0 END), 0) as total_donations,
        COUNT(CASE WHEN t.student_id IS NOT NULL THEN t.id END) as total_transactions,
        COALESCE(SUM(CASE WHEN t.student_id IS NOT NULL THEN tb.quantity ELSE 0 END), 0) as total_books_sold,
        (
          SELECT COUNT(bs.id)
          FROM bible_studies bs
          JOIN people p2 ON bs.colporter_id = p2.id
          WHERE bs.program_id = ?
            AND bs.created_at >= ?
            AND bs.created_at <= DATE_ADD(?, INTERVAL 1 DAY)
            AND p2.status = 'ACTIVE'
            AND p2.program_id = ?
        ) as total_bible_studies
      FROM people p
      LEFT JOIN transactions t ON p.id = t.student_id
        AND t.status = 'APPROVED'
        AND t.transaction_date >= ? 
        AND t.transaction_date <= ?
        AND t.program_id = ?
      LEFT JOIN transaction_books tb ON t.id = tb.transaction_id
      WHERE p.status = 'ACTIVE'
        AND p.program_id = ?
    `, [program.id, program.start_date, program.end_date, program.id, program.start_date, program.end_date, program.id, program.id]);

    res.json({
      program,
      stats
    });
  } catch (error) {
    console.error('Error getting program stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getAchievements,
  getBookCategories,
  getProgramStats
};
