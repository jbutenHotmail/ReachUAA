import * as db from '../config/database.js';

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate start dates for week and month
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get today's sales
    const todaySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date = ?
       AND status = 'APPROVED'`,
      [today]
    );
    
    // Get today's books
    const todayBooks = await db.query(
      `SELECT b.price, SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date = ?
       AND t.status = 'APPROVED'
       GROUP BY b.price >= 20`,
      [today]
    );
    
    // Calculate large and small books
    const todayLargeBooks = todayBooks.find(b => b.price >= 20)?.quantity || 0;
    const todaySmallBooks = todayBooks.find(b => b.price < 20)?.quantity || 0;
    
    // Get weekly sales
    const weeklySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status = 'APPROVED'`,
      [weekStartStr, today]
    );
    
    // Get weekly books
    const weeklyBooks = await db.query(
      `SELECT b.price >= 20 as isLarge, SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY b.price >= 20`,
      [weekStartStr, today]
    );
    
    // Calculate large and small books for week
    const weeklyLargeBooks = weeklyBooks.find(b => b.isLarge)?.quantity || 0;
    const weeklySmallBooks = weeklyBooks.find(b => !b.isLarge)?.quantity || 0;
    
    // Get monthly sales
    const monthlySales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status = 'APPROVED'`,
      [monthStartStr, today]
    );
    
    // Get monthly books
    const monthlyBooks = await db.query(
      `SELECT b.price >= 20 as isLarge, SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY b.price >= 20`,
      [monthStartStr, today]
    );
    
    // Calculate large and small books for month
    const monthlyLargeBooks = monthlyBooks.find(b => b.isLarge)?.quantity || 0;
    const monthlySmallBooks = monthlyBooks.find(b => !b.isLarge)?.quantity || 0;
    
    // Get program total sales
    const programSales = await db.getOne(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status = 'APPROVED'`,
      [program.start_date, today]
    );
    
    // Get sales chart data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const salesChart = await db.query(
      `SELECT transaction_date as date, COALESCE(SUM(total), 0) as amount
       FROM transactions
       WHERE transaction_date BETWEEN ? AND ?
       AND status = 'APPROVED'
       GROUP BY transaction_date
       ORDER BY transaction_date`,
      [thirtyDaysAgoStr, today]
    );
    
    // Calculate program stats
    const programGoal = program.financial_goal;
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