import * as db from '../config/database.js';

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Use the date from the request if provided, otherwise use server date
    const today = req.query.date || new Date().toISOString().split('T')[0];
    const programId = req.query.programId || req.user.currentProgramId;
    
    // Calculate start dates for week and month
    // Modified to use Sunday as start of week and Saturday as end of week
    const currentDate = new Date(today);
    
    // Get the Sunday (start of week)
    // If today is Sunday (0), use today, otherwise go back to previous Sunday
    const weekStart = new Date(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    weekStart.setDate(currentDate.getDate() - dayOfWeek); // Go back to Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    // Get the Saturday (end of week)
    // Go forward to the next Saturday (6) from the Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday + 6 days = Saturday
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    // Calculate month dates (unchanged)
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Add program filter to all queries
    const programFilter = programId ? 'AND t.program_id = ?' : '';
    const programParams = programId ? [programId] : [];
    
    // Get today's sales - only APPROVED transactions
    const todaySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions t
       WHERE transaction_date = ?
       AND status IN ('APPROVED')
       ${programFilter}`,
      [today, ...programParams]
    );
    
    // Get today's books - only APPROVED transactions
    const todayBooks = await db.query(
      `SELECT 
         CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date = ?
       AND t.status IN ('APPROVED')
       ${programFilter}
       GROUP BY CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END`,
      [today, ...programParams]
    );
    
    // Calculate large and small books
    const todayLargeBooks = todayBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const todaySmallBooks = todayBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get weekly sales - only APPROVED transactions
    // Updated to use weekStartStr and weekEndStr
    const weeklySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions t
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('APPROVED')
       ${programFilter}`,
      [weekStartStr, weekEndStr, ...programParams]
    );
    
    // Get weekly books - only APPROVED transactions
    const weeklyBooks = await db.query(
      `SELECT 
         CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status IN ('APPROVED')
       ${programFilter}
       GROUP BY CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END`,
      [weekStartStr, weekEndStr, ...programParams]
    );
    
    // Calculate large and small books for week
    const weeklyLargeBooks = weeklyBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const weeklySmallBooks = weeklyBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get monthly sales - only APPROVED transactions
    const monthlySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions t
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('APPROVED')
       ${programFilter}`,
      [monthStartStr, today, ...programParams]
    );
    
    // Get monthly books - only APPROVED transactions
    const monthlyBooks = await db.query(
      `SELECT 
         CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status IN ('APPROVED')
       ${programFilter}
       GROUP BY CASE WHEN b.size = 'LARGE' THEN 'large' ELSE 'small' END`,
      [monthStartStr, today, ...programParams]
    );
    
    // Calculate large and small books for month
    const monthlyLargeBooks = monthlyBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const monthlySmallBooks = monthlyBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get program total sales - only APPROVED transactions
    const programSales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions t
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('APPROVED')
       ${programFilter}`,
      [program.start_date, today, ...programParams]
    );
    
    // Get sales chart data (last 30 days) - only APPROVED transactions
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const salesChart = await db.query(
      `SELECT transaction_date as date, COALESCE(SUM(total), 0) as amount
       FROM transactions t
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('APPROVED')
       ${programFilter}
       GROUP BY transaction_date
       ORDER BY transaction_date`,
      [thirtyDaysAgoStr, today, ...programParams]
    );
    
    // Calculate program stats
    const programGoal = parseFloat(program.financial_goal);
    const programAchieved = programSales.total;
    const programRemaining = programGoal - programAchieved;
    const programPercentage = (programAchieved / programGoal) * 100;
    
    // Construct response
    const stats = {
      today: {
        sales: todaySales.total,
        books: {
          large: todayLargeBooks,
          small: todaySmallBooks,
          total: todayLargeBooks + todaySmallBooks
        }
      },
      week: {
        sales: weeklySales.total,
        books: {
          large: weeklyLargeBooks,
          small: weeklySmallBooks,
          total: weeklyLargeBooks + weeklySmallBooks
        }
      },
      month: {
        sales: monthlySales.total,
        books: {
          large: monthlyLargeBooks,
          small: monthlySmallBooks,
          total: monthlyLargeBooks + monthlySmallBooks
        }
      },
      program: {
        goal: programGoal,
        achieved: programAchieved,
        remaining: programRemaining,
        percentageAchieved: programPercentage
      },
      salesChart
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getDashboardStats
};