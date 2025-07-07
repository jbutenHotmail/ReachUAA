import * as db from '../config/database.js';

// Get daily report
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use today's date if not provided
    const reportDate = date || new Date().toISOString().split('T')[0];
    
    // Get transactions for the day
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(sp.first_name, ' ', sp.last_name) as student_name,
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date = ?
       AND t.status = 'APPROVED'
       ORDER BY t.created_at DESC`,
      [reportDate]
    );
    
    // Get transaction books
    const transactionBooks = await Promise.all(
      transactions.map(async (transaction) => {
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.size, tb.quantity, tb.price
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transaction.id]
        );
        
        return {
          ...transaction,
          books
        };
      })
    );
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atm_mobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    // Calculate book totals
    const bookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    transactionBooks.forEach(transaction => {
      transaction.books.forEach(book => {
        if (book.size === 'LARGE') {
          bookTotals.large += book.quantity;
        } else {
          bookTotals.small += book.quantity;
        }
        bookTotals.total += book.quantity;
      });
    });
    
    res.json({
      date: reportDate,
      transactions: transactionBooks,
      totals,
      bookTotals
    });
  } catch (error) {
    console.error('Error getting daily report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get weekly report
export const getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Calculate default week dates if not provided
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate Monday of current week
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      
      // Calculate Sunday of current week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      reportStartDate = monday.toISOString().split('T')[0];
      reportEndDate = sunday.toISOString().split('T')[0];
    }
    
    // Get transactions for the week
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(sp.first_name, ' ', sp.last_name) as student_name,
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Group transactions by day
    const dailyTransactions = transactions.reduce((acc, transaction) => {
      const date = transaction.transaction_date;
      
      if (!acc[date]) {
        acc[date] = {
          transactions: [],
          totals: {
            cash: 0,
            checks: 0,
            atmMobile: 0,
            paypal: 0,
            total: 0
          },
          bookTotals: {
            large: 0,
            small: 0,
            total: 0
          }
        };
      }
      
      acc[date].transactions.push(transaction);
      acc[date].totals.cash += transaction.cash;
      acc[date].totals.checks += transaction.checks;
      acc[date].totals.atmMobile += transaction.atm_mobile;
      acc[date].totals.paypal += transaction.paypal;
      acc[date].totals.total += transaction.total;
      
      return acc;
    }, {});
    
    // Get transaction books and update book totals
    for (const date in dailyTransactions) {
      for (let i = 0; i < dailyTransactions[date].transactions.length; i++) {
        const transaction = dailyTransactions[date].transactions[i];
        
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.size, tb.quantity, tb.price
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transaction.id]
        );
        
        dailyTransactions[date].transactions[i].books = books;
        
        books.forEach(book => {
          if (book.size === 'LARGE') {
            dailyTransactions[date].bookTotals.large += book.quantity;
          } else {
            dailyTransactions[date].bookTotals.small += book.quantity;
          }
          dailyTransactions[date].bookTotals.total = dailyTransactions[date].bookTotals.large + dailyTransactions[date].bookTotals.small;
        });
      }
    }
    
    // Calculate week totals
    const weekTotals = {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    };
    
    const weekBookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    for (const date in dailyTransactions) {
      weekTotals.cash += dailyTransactions[date].totals.cash;
      weekTotals.checks += dailyTransactions[date].totals.checks;
      weekTotals.atmMobile += dailyTransactions[date].totals.atmMobile;
      weekTotals.paypal += dailyTransactions[date].totals.paypal;
      weekTotals.total += dailyTransactions[date].totals.total;
      
      weekBookTotals.large += dailyTransactions[date].bookTotals.large;
      weekBookTotals.small += dailyTransactions[date].bookTotals.small;
      weekBookTotals.total += dailyTransactions[date].bookTotals.total;
    }
    
    res.json({
      startDate: reportStartDate,
      endDate: reportEndDate,
      dailyTransactions,
      weekTotals,
      weekBookTotals
    });
  } catch (error) {
    console.error('Error getting weekly report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get monthly report
export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Calculate default month and year if not provided
    const today = new Date();
    const reportMonth = month ? parseInt(month) : today.getMonth() + 1; // 1-12
    const reportYear = year ? parseInt(year) : today.getFullYear();
    
    // Calculate start and end dates for the month
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);
    
    const reportStartDate = startDate.toISOString().split('T')[0];
    const reportEndDate = endDate.toISOString().split('T')[0];
    
    // Get transactions for the month
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(sp.first_name, ' ', sp.last_name) as student_name,
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Group transactions by week
    const weeklyTransactions = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transaction_date);
      const weekNumber = Math.ceil((date.getDate() + startDate.getDay()) / 7);
      const weekKey = `Week ${weekNumber}`;
      
      if (!acc[weekKey]) {
        acc[weekKey] = {
          transactions: [],
          totals: {
            cash: 0,
            checks: 0,
            atmMobile: 0,
            paypal: 0,
            total: 0
          },
          bookTotals: {
            large: 0,
            small: 0,
            total: 0
          }
        };
      }
      
      acc[weekKey].transactions.push(transaction);
      acc[weekKey].totals.cash += transaction.cash;
      acc[weekKey].totals.checks += transaction.checks;
      acc[weekKey].totals.atmMobile += transaction.atm_mobile;
      acc[weekKey].totals.paypal += transaction.paypal;
      acc[weekKey].totals.total += transaction.total;
      
      return acc;
    }, {});
    
    // Get transaction books and update book totals
    for (const weekKey in weeklyTransactions) {
      for (let i = 0; i < weeklyTransactions[weekKey].transactions.length; i++) {
        const transaction = weeklyTransactions[weekKey].transactions[i];
        
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.size, tb.quantity, tb.price
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transaction.id]
        );
        
        weeklyTransactions[weekKey].transactions[i].books = books;
        
        books.forEach(book => {
          if (book.size === 'LARGE') {
            weeklyTransactions[weekKey].bookTotals.large += book.quantity;
          } else {
            weeklyTransactions[weekKey].bookTotals.small += book.quantity;
          }
          weeklyTransactions[weekKey].bookTotals.total += book.quantity;
        });
      }
    }
    
    // Calculate month totals
    const monthTotals = {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    };
    
    const monthBookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    for (const weekKey in weeklyTransactions) {
      monthTotals.cash += weeklyTransactions[weekKey].totals.cash;
      monthTotals.checks += weeklyTransactions[weekKey].totals.checks;
      monthTotals.atmMobile += weeklyTransactions[weekKey].totals.atmMobile;
      monthTotals.paypal += weeklyTransactions[weekKey].totals.paypal;
      monthTotals.total += weeklyTransactions[weekKey].totals.total;
      
      monthBookTotals.large += weeklyTransactions[weekKey].bookTotals.large;
      monthBookTotals.small += weeklyTransactions[weekKey].bookTotals.small;
      monthBookTotals.total += weeklyTransactions[weekKey].bookTotals.total;
    }
    
    res.json({
      month: reportMonth,
      year: reportYear,
      startDate: reportStartDate,
      endDate: reportEndDate,
      weeklyTransactions,
      monthTotals,
      monthBookTotals
    });
  } catch (error) {
    console.error('Error getting monthly report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get colporter report
export const getColporterReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Calculate default dates if not provided
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      // Default to current month
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    // Get colporter details
    const colporter = await db.getOne(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, school, age
       FROM people
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!colporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    // Get transactions for the colporter
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.student_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    // Get transaction books
    const transactionBooks = await Promise.all(
      transactions.map(async (transaction) => {
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.category, b.size, b.price, tb.quantity
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transaction.id]
        );
        
        return {
          ...transaction,
          books
        };
      })
    );
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atm_mobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    // Calculate book totals
    const bookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    transactionBooks.forEach(transaction => {
      transaction.books.forEach(book => {
        if (book.size === 'LARGE') {
          bookTotals.large += book.quantity;
        } else {
          bookTotals.small += book.quantity;
        }
        bookTotals.total += book.quantity;
      });
    });
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Calculate earnings
    const colporterPercentage = financialConfig?.colporter_percentage 
      ? parseFloat(financialConfig.colporter_percentage) 
      : 50;
    
    const earnings = totals.total * (colporterPercentage / 100);
    
    // Get charges for the colporter
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status, c.charge_date as date
       FROM charges c
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get cash advances for the colporter
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.week_start_date, ca.week_end_date, ca.status, ca.request_date as date
       FROM cash_advances ca
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Calculate net earnings
    const netEarnings = earnings - totalCharges - totalAdvances;
    
    res.json({
      colporter,
      startDate: reportStartDate,
      endDate: reportEndDate,
      transactions: transactionBooks,
      totals,
      bookTotals,
      earnings: {
        gross: totals.total,
        percentage: colporterPercentage,
        net: earnings,
        charges: totalCharges,
        advances: totalAdvances,
        final: netEarnings
      },
      charges,
      advances
    });
  } catch (error) {
    console.error('Error getting colporter report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leader report
export const getLeaderReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Calculate default dates if not provided
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      // Default to current month
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    // Get leader details
    const leader = await db.getOne(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, institution
       FROM people
       WHERE id = ? AND person_type = 'LEADER'`,
      [id]
    );
    
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    // Get transactions for the leader's team
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(sp.first_name, ' ', sp.last_name) as student_name
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       WHERE t.leader_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    // Get transaction books
    const transactionBooks = await Promise.all(
      transactions.map(async (transaction) => {
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.category, b.size, b.price, tb.quantity
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transaction.id]
        );
        
        return {
          ...transaction,
          books
        };
      })
    );
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atm_mobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    // Calculate book totals
    const bookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    transactionBooks.forEach(transaction => {
      transaction.books.forEach(book => {
        if (book.size === 'LARGE') {
          bookTotals.large += book.quantity;
        } else {
          bookTotals.small += book.quantity;
        }
        bookTotals.total += book.quantity;
      });
    });
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Calculate earnings
    const leaderPercentage = financialConfig?.leader_percentage 
      ? parseFloat(financialConfig.leader_percentage) 
      : 15;
    
    const earnings = totals.total * (leaderPercentage / 100);
    
    // Get charges for the leader
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status, c.charge_date as date
       FROM charges c
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get cash advances for the leader
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.week_start_date, ca.week_end_date, ca.status, ca.request_date as date
       FROM cash_advances ca
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Calculate net earnings
    const netEarnings = earnings - totalCharges - totalAdvances;
    
    // Get colporter performance
    const colporterPerformance = await db.query(
      `SELECT 
         p.id,
         CONCAT(p.first_name, ' ', p.last_name) as name,
         COUNT(t.id) as transaction_count,
         COALESCE(SUM(t.total), 0) as total_sales
       FROM people p
       JOIN transactions t ON p.id = t.student_id
       WHERE t.leader_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY p.id
       ORDER BY total_sales DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    // Get book details for each colporter
    const colporterDetails = await Promise.all(
      colporterPerformance.map(async (colporter) => {
        const colporterBooks = await db.query(
          `SELECT 
             b.id,
             b.title,
             b.price,
             b.size,
             SUM(tb.quantity) as quantity
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           JOIN transactions t ON tb.transaction_id = t.id
           WHERE t.student_id = ?
           AND t.transaction_date BETWEEN ? AND ?
           AND t.status = 'APPROVED'
           GROUP BY b.id
           ORDER BY quantity DESC`,
          [colporter.id, reportStartDate, reportEndDate]
        );
        
        // Calculate book totals for this colporter
        const colporterBookTotals = {
          large: 0,
          small: 0,
          total: 0
        };
        
        colporterBooks.forEach(book => {
          if (book.size === 'LARGE') {
            colporterBookTotals.large += book.quantity;
          } else {
            colporterBookTotals.small += book.quantity;
          }
          colporterBookTotals.total += book.quantity;
        });
        
        return {
          ...colporter,
          books: colporterBooks,
          bookTotals: colporterBookTotals
        };
      })
    );
    
    res.json({
      leader,
      startDate: reportStartDate,
      endDate: reportEndDate,
      transactions: transactionBooks,
      totals,
      bookTotals,
      earnings: {
        gross: totals.total,
        percentage: leaderPercentage,
        net: earnings,
        charges: totalCharges,
        advances: totalAdvances,
        final: netEarnings
      },
      charges,
      advances,
      colporters: colporterDetails
    });
  } catch (error) {
    console.error('Error getting leader report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get program report
export const getProgramReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Calculate default dates if not provided
    let reportStartDate = startDate || program.start_date;
    let reportEndDate = endDate || new Date().toISOString().split('T')[0];
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [program.id]
    );
    
    // Get all transactions
    const transactions = await db.query(
      `SELECT t.*, 
       CONCAT(sp.first_name, ' ', sp.last_name) as student_name,
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atm_mobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    // Get all books delivered
    const books = await db.query(
      `SELECT 
         b.id,
         b.title,
         b.category,
         b.size,
         b.price,
         SUM(tb.quantity) as quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       JOIN transactions t ON tb.transaction_id = t.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY b.id
       ORDER BY quantity DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Calculate book totals
    const bookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    books.forEach(book => {
      if (book.size === 'LARGE') {
        bookTotals.large += book.quantity;
      } else {
        bookTotals.small += book.quantity;
      }
      bookTotals.total += book.quantity;
    });
    
    // Get all expenses - ONLY APPROVED EXPENSES
    const expenses = await db.query(
      `SELECT e.*, 
       CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leader_name
       FROM expenses e
       LEFT JOIN people p ON e.leader_id = p.id
       WHERE e.expense_date BETWEEN ? AND ?
       AND e.status = 'APPROVED'
       ORDER BY e.expense_date DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Calculate expense totals
    const expenseTotals = expenses.reduce((acc, e) => {
      if (e.leader_id === null) {
        acc.program += e.amount;
      } else {
        acc.leaders += e.amount;
      }
      acc.total += e.amount;
      return acc;
    }, {
      program: 0,
      leaders: 0,
      total: 0
    });
    
    // Get all cash advances - ONLY APPROVED ADVANCES
    const advances = await db.query(
      `SELECT ca.*, 
       CONCAT(p.first_name, ' ', p.last_name) as person_name,
       p.person_type
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       WHERE ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Calculate advance totals
    const advanceTotals = advances.reduce((acc, a) => {
      if (a.person_type === 'COLPORTER') {
        acc.colporters += a.advance_amount;
      } else {
        acc.leaders += a.advance_amount;
      }
      acc.total += a.advance_amount;
      return acc;
    }, {
      colporters: 0,
      leaders: 0,
      total: 0
    });
    
    // Calculate distribution
    const colporterPercentage = financialConfig?.colporter_percentage 
      ? parseFloat(financialConfig.colporter_percentage) 
      : 50;
    
    const leaderPercentage = financialConfig?.leader_percentage 
      ? parseFloat(financialConfig.leader_percentage) 
      : 15;
    
    const programPercentage = 100 - colporterPercentage - leaderPercentage;
    
    const distribution = {
      colporters: totals.total * (colporterPercentage / 100),
      leaders: totals.total * (leaderPercentage / 100),
      program: totals.total * (programPercentage / 100)
    };
    
    // Calculate program expenses (only program expenses, not leader expenses)
    const programExpenses = expenses
      .filter(e => e.leader_id === null && e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate net profit
    const netProfit = distribution.program - programExpenses - advanceTotals.total;
    
    // Get leader performance
    const leaderPerformance = await db.query(
      `SELECT 
         p.id,
         CONCAT(p.first_name, ' ', p.last_name) as name,
         COUNT(DISTINCT t.student_id) as colporter_count,
         COUNT(t.id) as transaction_count,
         COALESCE(SUM(t.total), 0) as total_sales
       FROM people p
       JOIN transactions t ON p.id = t.leader_id
       WHERE p.person_type = 'LEADER'
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY p.id
       ORDER BY total_sales DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Get colporter performance
    const colporterPerformance = await db.query(
      `SELECT 
         p.id,
         CONCAT(p.first_name, ' ', p.last_name) as name,
         lp.id as leader_id,
         CONCAT(lp.first_name, ' ', lp.last_name) as leader_name,
         COUNT(t.id) as transaction_count,
         COALESCE(SUM(t.total), 0) as total_sales
       FROM people p
       JOIN transactions t ON p.id = t.student_id
       JOIN people lp ON t.leader_id = lp.id
       WHERE p.person_type = 'COLPORTER'
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       GROUP BY p.id, lp.id
       ORDER BY total_sales DESC`,
      [reportStartDate, reportEndDate]
    );
    
    // Calculate program goal progress
    const goalProgress = {
      goal: parseFloat(program.financial_goal),
      achieved: totals.total,
      remaining: parseFloat(program.financial_goal) - totals.total,
      percentage: (totals.total / parseFloat(program.financial_goal)) * 100
    };
    
    res.json({
      program,
      financialConfig,
      startDate: reportStartDate,
      endDate: reportEndDate,
      totals,
      bookTotals,
      books,
      expenses,
      expenseTotals,
      advances,
      advanceTotals,
      distribution,
      programExpenses,
      netProfit,
      leaderPerformance,
      colporterPerformance,
      goalProgress
    });
  } catch (error) {
    console.error('Error getting program report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get individual earnings report
export const getIndividualEarningsReport = async (req, res) => {
  try {
    const { id } = req.params; // This is the user ID
    const { startDate, endDate } = req.query;
    
    // Calculate default dates if not provided
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      // Default to current month
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    // Get person details using userId to find the associated person
    const person = await db.getOne(
      `SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name, p.email, p.phone, p.person_type, 
       CASE 
         WHEN p.person_type = 'COLPORTER' THEN p.school
         WHEN p.person_type = 'LEADER' THEN p.institution
         ELSE NULL
       END as organization
       FROM people p
       JOIN users u ON p.id = u.person_id
       WHERE u.id = ?`,
      [id]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found for this user' });
    }
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Get transactions based on person type
    let transactions;
    if (person.person_type === 'COLPORTER') {
      transactions = await db.query(
        `SELECT t.*, 
         CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
         FROM transactions t
         JOIN people lp ON t.leader_id = lp.id
         WHERE t.student_id = ?
         AND t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         ORDER BY t.transaction_date, t.created_at DESC`,
        [person.id, reportStartDate, reportEndDate]
      );
    } else {
      transactions = await db.query(
        `SELECT t.*, 
         CONCAT(sp.first_name, ' ', sp.last_name) as student_name
         FROM transactions t
         JOIN people sp ON t.student_id = sp.id
         WHERE t.leader_id = ?
         AND t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         ORDER BY t.transaction_date, t.created_at DESC`,
        [person.id, reportStartDate, reportEndDate]
      );
    }
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atm_mobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    // Calculate earnings based on person type
    const percentage = person.person_type === 'COLPORTER'
      ? (financialConfig?.colporter_percentage ? parseFloat(financialConfig.colporter_percentage) : 50)
      : (financialConfig?.leader_percentage ? parseFloat(financialConfig.leader_percentage) : 15);
    
    const earnings = totals.total * (percentage / 100);
    
    // Get charges for the person
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status, c.charge_date as date
       FROM charges c
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date DESC`,
      [person.id, reportStartDate, reportEndDate]
    );
    
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get cash advances for the person
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.week_start_date, ca.week_end_date, ca.status, ca.request_date as date
       FROM cash_advances ca
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date DESC`,
      [person.id, reportStartDate, reportEndDate]
    );
    
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Calculate net earnings
    const netEarnings = earnings - totalCharges - totalAdvances;
    
    // Group transactions by day
    const dailyEarnings = transactions.reduce((acc, transaction) => {
      const date = transaction.transaction_date;
      
      if (!acc[date]) {
        acc[date] = 0;
      }
      
      acc[date] += transaction.total;
      
      return acc;
    }, {});
    
    res.json({
      person,
      startDate: reportStartDate,
      endDate: reportEndDate,
      transactions,
      totals,
      earnings: {
        gross: totals.total,
        percentage,
        net: earnings,
        charges: totalCharges,
        advances: totalAdvances,
        final: netEarnings
      },
      charges,
      advances,
      dailyEarnings
    });
  } catch (error) {
    console.error('Error getting individual earnings report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get sales history for dashboard
export const getSalesHistory = async (req, res) => {
  try {
    const { userId, period } = req.params;
    
    // Calculate date range based on period
    const today = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        break;
      case 'all':
      default:
        // Get program start date
        const program = await db.getOne(
          'SELECT start_date FROM programs WHERE is_active = TRUE'
        );
        startDate = program ? new Date(program.start_date) : new Date(today.getFullYear(), 0, 1);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    // Get user details
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get person details if user has a person_id
    let personId = null;
    let personType = null;
    
    if (user.person_id) {
      const person = await db.getOne(
        'SELECT id, person_type FROM people WHERE id = ?',
        [user.person_id]
      );
      
      if (person) {
        personId = person.id;
        personType = person.person_type;
      }
    }
    
    // Get daily sales data based on user role and person type
    let salesData = [];
    
    if (user.role === 'ADMIN') {
      // For admin, get all sales
      salesData = await db.query(
        `SELECT 
           transaction_date as date,
           COALESCE(SUM(total), 0) as amount
         FROM transactions
         WHERE transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'
         GROUP BY transaction_date
         ORDER BY transaction_date`,
        [startDateStr, endDateStr]
      );
    } else if (personType === 'LEADER') {
      // For leaders, get their team's sales
      salesData = await db.query(
        `SELECT 
           transaction_date as date,
           COALESCE(SUM(total), 0) as amount
         FROM transactions
         WHERE leader_id = ?
         AND transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'
         GROUP BY transaction_date
         ORDER BY transaction_date`,
        [personId, startDateStr, endDateStr]
      );
    } else if (personType === 'COLPORTER') {
      // For colporters, get their own sales
      salesData = await db.query(
        `SELECT 
           transaction_date as date,
           COALESCE(SUM(total), 0) as amount
         FROM transactions
         WHERE student_id = ?
         AND transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'
         GROUP BY transaction_date
         ORDER BY transaction_date`,
        [personId, startDateStr, endDateStr]
      );
    } else {
      // For other users, return empty data
      salesData = [];
      // Get books for each transaction
      for (let i = 0; i < transactions.length; i++) {
        const books = await db.query(
          `SELECT tb.book_id as id, b.title, b.size, tb.quantity, tb.price
           FROM transaction_books tb
           JOIN books b ON tb.book_id = b.id
           WHERE tb.transaction_id = ?`,
          [transactions[i].id]
        );
        
        transactions[i].books = books;
      }
      
    }
    
    // Ensure we have data for every day in the range
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = salesData.find(d => d.date === dateStr);
      
      result.push({
        date: dateStr,
        amount: existingData ? existingData.amount : 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting sales history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get financial summary for dashboard
export const getFinancialSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate start dates for week and month
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth() - 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    // Get person details if user has a person_id
    let personId = null;
    let personType = null;
    
    if (user.person_id) {
      const person = await db.getOne(
        'SELECT id, person_type FROM people WHERE id = ?',
        [user.person_id]
      );
      
      if (person) {
        personId = person.id;
        personType = person.person_type;
      }
    }
    
    // Get sales data based on user role and person type
    let totalSales = 0;
    let dailySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    
    if (user.role === 'ADMIN') {
      // For admin, get all sales
      const salesData = await db.getOne(
        `SELECT 
           COALESCE(SUM(total), 0) as total_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date = ? AND status = 'APPROVED') as daily_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as weekly_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as monthly_sales
         FROM transactions
         WHERE transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'`,
        [todayStr, weekStartStr, todayStr, monthStartStr, todayStr, program.start_date, todayStr]
      );
      
      totalSales = salesData.total_sales;
      dailySales = salesData.daily_sales;
      weeklySales = salesData.weekly_sales;
      monthlySales = salesData.monthly_sales;
    } else if (personType === 'LEADER') {
      // For leaders, get their team's sales
      const salesData = await db.getOne(
        `SELECT 
           COALESCE(SUM(total), 0) as total_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE leader_id = ? AND transaction_date = ? AND status = 'APPROVED') as daily_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE leader_id = ? AND transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as weekly_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE leader_id = ? AND transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as monthly_sales
         FROM transactions
         WHERE leader_id = ?
         AND transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'`,
        [personId, todayStr, personId, weekStartStr, todayStr, personId, monthStartStr, todayStr, personId, program.start_date, todayStr]
      );
      
      totalSales = salesData.total_sales;
      dailySales = salesData.daily_sales;
      weeklySales = salesData.weekly_sales;
      monthlySales = salesData.monthly_sales;
    } else if (personType === 'COLPORTER') {
      // For colporters, get their own sales
      const salesData = await db.getOne(
        `SELECT 
           COALESCE(SUM(total), 0) as total_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE student_id = ? AND transaction_date = ? AND status = 'APPROVED') as daily_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE student_id = ? AND transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as weekly_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE student_id = ? AND transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as monthly_sales
         FROM transactions
         WHERE student_id = ?
         AND transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'`,
        [personId, todayStr, personId, weekStartStr, todayStr, personId, monthStartStr, todayStr, personId, program.start_date, todayStr]
      );
      
      totalSales = salesData.total_sales;
      dailySales = salesData.daily_sales;
      weeklySales = salesData.weekly_sales;
      monthlySales = salesData.monthly_sales;
    }
    
    res.json({
      totalSales,
      dailySales,
      weeklySales,
      monthlySales
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getColporterReport,
  getLeaderReport,
  getProgramReport,
  getIndividualEarningsReport,
  getSalesHistory,
  getFinancialSummary
};