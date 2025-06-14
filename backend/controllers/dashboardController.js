import * as db from '../config/database.js';

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Log the current date for debugging
    console.log('Backend today date:', new Date().toISOString().split('T')[0]);
    
    // Use the date from the request if provided, otherwise use server date
    const today = req.query.date || new Date().toISOString().split('T')[0];
    console.log('Using date for dashboard stats:', today);
    
    // Calculate start dates for week and month
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
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
    
    // Get today's sales - only PENDING and APPROVED transactions
    const todaySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date = ?
       AND status IN ('PENDING', 'APPROVED')`,
      [today]
    );
    
    // Get today's books - only PENDING and APPROVED transactions
    // Fix the GROUP BY clause to avoid SQL error
    const todayBooks = await db.query(
      `SELECT 
         CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date = ?
       AND t.status IN ('PENDING', 'APPROVED')
       GROUP BY CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END`,
      [today]
    );
    
    // Calculate large and small books
    const todayLargeBooks = todayBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const todaySmallBooks = todayBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get weekly sales - only PENDING and APPROVED transactions
    const weeklySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('PENDING', 'APPROVED')`,
      [weekStartStr, today]
    );
    
    // Get weekly books - only PENDING and APPROVED transactions
    // Fix the GROUP BY clause to avoid SQL error
    const weeklyBooks = await db.query(
      `SELECT 
         CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status IN ('PENDING', 'APPROVED')
       GROUP BY CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END`,
      [weekStartStr, today]
    );
    
    // Calculate large and small books for week
    const weeklyLargeBooks = weeklyBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const weeklySmallBooks = weeklyBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get monthly sales - only PENDING and APPROVED transactions
    const monthlySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('PENDING', 'APPROVED')`,
      [monthStartStr, today]
    );
    
    // Get monthly books - only PENDING and APPROVED transactions
    // Fix the GROUP BY clause to avoid SQL error
    const monthlyBooks = await db.query(
      `SELECT 
         CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END as book_size, 
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status IN ('PENDING', 'APPROVED')
       GROUP BY CASE WHEN b.price >= 20 THEN 'large' ELSE 'small' END`,
      [monthStartStr, today]
    );
    
    // Calculate large and small books for month
    const monthlyLargeBooks = monthlyBooks.find(b => b.book_size === 'large')?.quantity || 0;
    const monthlySmallBooks = monthlyBooks.find(b => b.book_size === 'small')?.quantity || 0;
    
    // Get program total sales - only PENDING and APPROVED transactions
    const programSales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('PENDING', 'APPROVED')`,
      [program.start_date, today]
    );
    
    // Get sales chart data (last 30 days) - only PENDING and APPROVED transactions
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const salesChart = await db.query(
      `SELECT transaction_date as date, COALESCE(SUM(total), 0) as amount
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status IN ('PENDING', 'APPROVED')
       GROUP BY transaction_date
       ORDER BY transaction_date`,
      [thirtyDaysAgoStr, today]
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