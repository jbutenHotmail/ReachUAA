import * as db from '../config/database.js';

// Get daily report (unchanged)
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    
    const reportDate = date || new Date().toISOString().split('T')[0];
    
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
    
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atmMobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
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

// Get weekly report (unchanged)
export const getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const day = today.getDay();
      
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      reportStartDate = monday.toISOString().split('T')[0];
      reportEndDate = sunday.toISOString().split('T')[0];
    }
    
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
          dailyTransactions[date].bookTotals.total += book.quantity;
        });
      }
    }
    
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

// Get monthly report (unchanged)
export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const today = new Date();
    const reportMonth = month ? parseInt(month) : today.getMonth() + 1;
    const reportYear = year ? parseInt(year) : today.getFullYear();
    
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);
    
    const reportStartDate = startDate.toISOString().split('T')[0];
    const reportEndDate = endDate.toISOString().split('T')[0];
    
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
    
    for (const weekKey in weeklyTransactions) {
      for (let i = 0; i < weeklyTransactions[weekKey].transactions.length; i++) {
        const transaction = weeklyTransactions[weekKey].transactions[i];
        
        const books = await db.query(
          `SELECT tb.book_id, b.title, b.category, b.size, b.price, tb.quantity
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
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    const colporter = await db.getOne(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, school, age, program_id
       FROM people
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!colporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [colporter.program_id]
    );
    
    const transactions = await db.query(
      `SELECT t.*, t.transaction_date as date,
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.student_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
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
    
    const bibleStudies = await db.query(
      `SELECT bs.id, bs.name, bs.phone, bs.address, bs.location, bs.municipality_id,
       m.name as municipality_name, bs.study_type, bs.interest_topic,
       bs.physical_description, bs.photo_url, bs.notes, bs.created_at
       FROM bible_studies bs
       LEFT JOIN municipalities m ON bs.municipality_id = m.id
       WHERE bs.colporter_id = ?
       AND bs.created_at BETWEEN ? AND ?
       ORDER BY bs.created_at DESC`,
      [id, reportStartDate, reportEndDate]
    );
    
    const bookSales = new Map();
    
    transactionBooks.forEach(transaction => {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          const bookKey = `${book.book_id}-${book.title}`;
          
          if (!bookSales.has(bookKey)) {
            bookSales.set(bookKey, {
              id: book.book_id,
              title: book.title,
              size: book.size,
              price: book.price,
              image_url: null,
              totalQuantity: 0,
              totalRevenue: 0
            });
          }
          
          const bookData = bookSales.get(bookKey);
          bookData.totalQuantity += book.quantity;
          bookData.totalRevenue += book.price * book.quantity;
        });
      }
    });
    
    if (bookSales.size > 0) {
      const bookIds = Array.from(bookSales.keys()).map(key => key.split('-')[0]);
      const bookImages = await db.query(
        `SELECT id, image_url FROM books WHERE id IN (${bookIds.map(() => '?').join(',')})`,
        bookIds
      );
      
      bookImages.forEach(bookImg => {
        for (const [key, bookData] of bookSales.entries()) {
          if (bookData.id == bookImg.id) {
            bookData.image_url = bookImg.image_url;
          }
        }
      });
    }
    
    const topSellerBook = Array.from(bookSales.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)[0] || null;
    
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atmMobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
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
    
    const colporterPercentage = financialConfig?.colporter_percentage 
      ? parseFloat(financialConfig.colporter_percentage) 
      : 50;
    
    const earnings = totals.total * (colporterPercentage / 100);
    
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
    
    const netEarnings = earnings - totalCharges - totalAdvances;
    
    res.json({
      colporter,
      startDate: reportStartDate,
      endDate: reportEndDate,
      transactions: transactionBooks,
      totals,
      bookTotals,
      bibleStudies,
      topSellerBook,
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
    
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    const leader = await db.getOne(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, institution, program_id
       FROM people
       WHERE id = ? AND person_type = 'LEADER'`,
      [id]
    );
    
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [leader.program_id]
    );
    
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
    
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atmMobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
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
    
    const individualPercentage = await db.getOne(
      'SELECT percentage FROM leader_percentages WHERE leader_id = ? AND program_id = ? AND is_active = TRUE',
      [id, leader.program_id]
    );
    
    const leaderPercentage = individualPercentage 
      ? parseFloat(individualPercentage.percentage)
      : (financialConfig?.leader_percentage ? parseFloat(financialConfig.leader_percentage) : 15);
    
    const earnings = totals.total * (leaderPercentage / 100);
    
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
        final: earnings - totalCharges - totalAdvances
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
    
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    let reportStartDate = startDate || program.start_date;
    let reportEndDate = endDate || new Date().toISOString().split('T')[0];
    
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [program.id]
    );
    
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
    
    const totals = transactions.reduce((acc, t) => ({
      cash: acc.cash + t.cash,
      checks: acc.checks + t.checks,
      atmMobile: acc.atmMobile + t.atm_mobile,
      paypal: acc.paypal + t.paypal,
      total: acc.total + t.total
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
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
    
    const programExpenses = expenses
      .filter(e => e.leader_id === null && e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const netProfit = distribution.program - programExpenses - advanceTotals.total;
    
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

// Get individual earnings report (unchanged)
export const getIndividualEarningsReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type } = req.query;
    let reportStartDate = startDate;
    let reportEndDate = endDate;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      reportStartDate = firstDay.toISOString().split('T')[0];
      reportEndDate = lastDay.toISOString().split('T')[0];
    }
    
    const person = await db.getOne(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, person_type, program_id, 
       CASE 
         WHEN person_type = 'COLPORTER' THEN school
         WHEN person_type = 'LEADER' THEN institution
         ELSE NULL
       END as organization
       FROM people
       WHERE ${type === 'user' ? 'id IN (SELECT person_id FROM users WHERE id = ?)' : 'id = ?'}`,
      [type === 'user' ? id : id]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [person.program_id]
    );
    
    let transactionsQuery = `
      SELECT t.*, 
       CONCAT(lp.first_name, ' ', lp.last_name) as leader_name
       FROM transactions t
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.student_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at DESC
    `;
    let transactionParams = [person.id, reportStartDate, reportEndDate];
    
    if (person.person_type === 'LEADER') {
      transactionsQuery = `
        SELECT t.*, 
         CONCAT(sp.first_name, ' ', sp.last_name) as student_name
         FROM transactions t
         JOIN people sp ON t.student_id = sp.id
         WHERE t.leader_id = ?
         AND t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         ORDER BY t.transaction_date, t.created_at DESC
      `;
      transactionParams = [person.id, reportStartDate, reportEndDate];
    }
    
    const transactions = await db.query(transactionsQuery, transactionParams);
    
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
    
    const totals = transactions.reduce((acc, t) => ({
      cash: Number(acc.cash) + Number(t.cash),
      checks: Number(acc.checks) + Number(t.checks),
      atmMobile: Number(acc.atmMobile) + Number(t.atm_mobile),
      paypal: Number(acc.paypal) + Number(t.paypal),
      total: Number(acc.total) + Number(t.total)
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0
    });
    
    let percentage;
    if (person.person_type === 'COLPORTER') {
      percentage = financialConfig?.colporter_percentage ? parseFloat(financialConfig.colporter_percentage) : 50;
    } else {
      const individualPercentage = await db.getOne(
        'SELECT percentage FROM leader_percentages WHERE leader_id = ? AND program_id = ? AND is_active = TRUE',
        [person.id, person.program_id]
      );
      percentage = individualPercentage 
        ? parseFloat(individualPercentage.percentage)
        : (financialConfig?.leader_percentage ? parseFloat(financialConfig.leader_percentage) : 15);
    }
    
    const earnings = totals.total * (percentage / 100);
    
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status, c.charge_date as date
       FROM charges c
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date DESC`,
      [person.id, reportStartDate, reportEndDate]
    );
    const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);
    
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.week_start_date, ca.week_end_date, ca.status, ca.request_date as date
       FROM cash_advances ca
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date DESC`,
      [person.id, reportStartDate, reportEndDate]
    );
    const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    
    let expenses = [];
    let totalExpenses = 0;
    if (person.person_type === 'LEADER') {
      expenses = await db.query(
        `SELECT e.id, e.amount, e.motivo, e.category, e.notes, e.expense_date as date,
         e.created_at as createdAt, e.updated_at as updatedAt
         FROM expenses e
         WHERE e.leader_id = ?
         AND e.expense_date BETWEEN ? AND ?
         AND e.status = 'APPROVED'
         ORDER BY e.expense_date DESC`,
        [person.id, reportStartDate, reportEndDate]
      );
      totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    }
    
    const finalEarnings = earnings - totalCharges - totalAdvances - totalExpenses;
    
    const dailyEarnings = {};
    
    transactions.forEach(transaction => {
      const date = formatDateToDDMMYYYY(transaction.transaction_date);
      
      if (!dailyEarnings[date]) {
        dailyEarnings[date] = 0;
      }
      
      dailyEarnings[date] += Number(transaction.total);
    });
    
    const bookSales = new Map();
    
    for (const transaction of transactions) {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          const bookKey = `${book.id}-${book.title}`;
          
          if (!bookSales.has(bookKey)) {
            bookSales.set(bookKey, {
              id: book.id,
              title: book.title,
              size: book.size,
              price: book.price,
              image_url: null,
              totalQuantity: 0,
              totalRevenue: 0
            });
          }
          
          const bookData = bookSales.get(bookKey);
          bookData.totalQuantity += book.quantity;
          bookData.totalRevenue += book.price * book.quantity;
        });
      }
    }
    
    if (bookSales.size > 0) {
      const bookIds = Array.from(bookSales.keys()).map(key => key.split('-')[0]);
      const bookImages = await db.query(
        `SELECT id, image_url FROM books WHERE id IN (${bookIds.map(() => '?').join(',')})`,
        bookIds
      );
      
      bookImages.forEach(bookImg => {
        for (const [key, bookData] of bookSales.entries()) {
          if (bookData.id == bookImg.id) {
            bookData.image_url = bookImg.image_url;
          }
        }
      });
    }
    
    const topSellerBook = Array.from(bookSales.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)[0] || null;
    
    const bookTotals = {
      large: 0,
      small: 0,
      total: 0
    };
    
    transactions.forEach(transaction => {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          if (book.size === 'LARGE') {
            bookTotals.large += book.quantity;
          } else {
            bookTotals.small += book.quantity;
          }
          bookTotals.total += book.quantity;
        });
      }
    });
    
    const dailySalesEntries = Object.entries(dailyEarnings);
    let bestDay = { date: '', amount: 0 };
    let worstDay = { date: '', amount: 0 };
    
    if (dailySalesEntries.length > 0) {
      bestDay = dailySalesEntries.reduce((best, [date, amount]) => 
        amount > best.amount ? { date, amount } : best, 
        { date: '', amount: 0 }
      );
      
      const daysWithSales = dailySalesEntries.filter(([_, amount]) => amount > 0);
      if (daysWithSales.length > 0) {
        worstDay = daysWithSales.reduce((worst, [date, amount]) => 
          amount < worst.amount ? { date, amount } : worst, 
          { date: '', amount: Infinity }
        );
      }
      
      if (worstDay.amount === Infinity) {
        worstDay = { date: '', amount: 0 };
      }
    }
    
    res.json({
      person: {
        ...person,
        personType: person.person_type
      },
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
        expenses: totalExpenses,
        final: finalEarnings
      },
      charges,
      advances,
      expenses,
      dailyEarnings,
      bookTotals,
      topSellerBook,
      bestDay,
      worstDay
    });
  } catch (error) {
    console.error('Error getting individual earnings report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get sales history
export const getSalesHistory = async (req, res) => {
  try {
    const { userId, period } = req.params;
    
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let personId = null;
    let personType = null;
    let programId = null;
    
    if (user.person_id) {
      const person = await db.getOne(
        'SELECT id, person_type, program_id FROM people WHERE id = ?',
        [user.person_id]
      );
      
      if (person) {
        personId = person.id;
        personType = person.person_type;
        programId = person.program_id;
      }
    }
    
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
        const program = await db.getOne(
          'SELECT start_date FROM programs WHERE id = ?',
          [programId]
        );
        startDate = program ? new Date(program.start_date) : new Date(today.getFullYear(), 0, 1);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    let salesData = [];
    
    if (user.role === 'ADMIN') {
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
      salesData = [];
    }
    
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

// Get financial summary
export const getFinancialSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let personId = null;
    let personType = null;
    let programId = null;
    
    if (user.person_id) {
      const person = await db.getOne(
        'SELECT id, person_type, program_id FROM people WHERE id = ?',
        [user.person_id]
      );
      
      if (person) {
        personId = person.id;
        personType = person.person_type;
        programId = person.program_id;
      }
    }
    
    const program = await db.getOne(
      'SELECT * FROM programs WHERE id = ?',
      [programId]
    );
    
    if (!program && user.role !== 'ADMIN') {
      return res.status(404).json({ message: 'No program found for user' });
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth() - 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const programStartStr = program ? program.start_date : new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    
    let totalSales = 0;
    let dailySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    
    if (user.role === 'ADMIN') {
      const salesData = await db.getOne(
        `SELECT 
           COALESCE(SUM(total), 0) as total_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date = ? AND status = 'APPROVED') as daily_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as weekly_sales,
           (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE transaction_date BETWEEN ? AND ? AND status = 'APPROVED') as monthly_sales
         FROM transactions
         WHERE transaction_date BETWEEN ? AND ?
         AND status = 'APPROVED'`,
        [todayStr, weekStartStr, todayStr, monthStartStr, todayStr, programStartStr, todayStr]
      );
      
      totalSales = salesData.total_sales;
      dailySales = salesData.daily_sales;
      weeklySales = salesData.weekly_sales;
      monthlySales = salesData.monthly_sales;
    } else if (personType === 'LEADER') {
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
        [personId, todayStr, personId, weekStartStr, todayStr, personId, monthStartStr, todayStr, personId, programStartStr, todayStr]
      );
      
      totalSales = salesData.total_sales;
      dailySales = salesData.daily_sales;
      weeklySales = salesData.weekly_sales;
      monthlySales = salesData.monthly_sales;
    } else if (personType === 'COLPORTER') {
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
        [personId, todayStr, personId, weekStartStr, todayStr, personId, monthStartStr, todayStr, personId, programStartStr, todayStr]
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

// Helper function to format date to DDMMYYYY
const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
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