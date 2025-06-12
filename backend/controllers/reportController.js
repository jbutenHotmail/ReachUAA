import * as db from '../config/database.js';

// Get daily report
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Get transactions for the day
    const transactions = await db.query(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.status, t.created_at as createdAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date = ?
       ORDER BY t.created_at DESC`,
      [date]
    );
    
    // Get books for each transaction
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
    }
    
    // Calculate totals
    const totals = transactions.reduce((acc, t) => {
      if (t.status === 'APPROVED' || t.status === 'PENDING') {
        acc.cash += t.cash;
        acc.checks += t.checks;
        acc.atmMobile += t.atmMobile;
        acc.paypal += t.paypal;
        acc.total += t.total;
      }
      return acc;
    }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    
    // Calculate book totals
    const bookTotals = { large: 0, small: 0, total: 0 };
    
    transactions.forEach(t => {
      if (t.status === 'APPROVED' || t.status === 'PENDING') {
        t.books?.forEach(b => {
          // Assuming books with price >= 20 are large books
          if (b.price >= 20) {
            bookTotals.large += b.quantity;
          } else {
            bookTotals.small += b.quantity;
          }
          bookTotals.total += b.quantity;
        });
      }
    });
    
    res.json({
      date,
      transactions,
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
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Get transactions for the week
    const transactions = await db.query(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at`,
      [startDate, endDate]
    );
    
    // Group transactions by date
    const dailyTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.date]) {
        acc[t.date] = [];
      }
      acc[t.date].push(t);
      return acc;
    }, {});
    
    // Calculate daily totals
    const dailyTotals = {};
    
    Object.entries(dailyTransactions).forEach(([date, txs]) => {
      dailyTotals[date] = txs.reduce((acc, t) => {
        acc.cash += t.cash;
        acc.checks += t.checks;
        acc.atmMobile += t.atmMobile;
        acc.paypal += t.paypal;
        acc.total += t.total;
        return acc;
      }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    });
    
    // Calculate weekly totals
    const weeklyTotals = transactions.reduce((acc, t) => {
      acc.cash += t.cash;
      acc.checks += t.checks;
      acc.atmMobile += t.atmMobile;
      acc.paypal += t.paypal;
      acc.total += t.total;
      return acc;
    }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    
    // Get books for each transaction and calculate book totals
    const booksByDay = {};
    const weeklyBookTotals = { large: 0, small: 0, total: 0 };
    
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
      
      // Add books to daily totals
      if (!booksByDay[transaction.date]) {
        booksByDay[transaction.date] = { large: 0, small: 0, total: 0 };
      }
      
      books.forEach(b => {
        // Assuming books with price >= 20 are large books
        if (b.price >= 20) {
          booksByDay[transaction.date].large += b.quantity;
          weeklyBookTotals.large += b.quantity;
        } else {
          booksByDay[transaction.date].small += b.quantity;
          weeklyBookTotals.small += b.quantity;
        }
        booksByDay[transaction.date].total += b.quantity;
        weeklyBookTotals.total += b.quantity;
      });
    }
    
    // Group transactions by colporter
    const colporterTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.studentId]) {
        acc[t.studentId] = {
          id: t.studentId,
          name: t.studentName,
          leaderId: t.leaderId,
          leaderName: t.leaderName,
          transactions: [],
          totals: { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 },
          books: { large: 0, small: 0, total: 0 }
        };
      }
      
      acc[t.studentId].transactions.push(t);
      acc[t.studentId].totals.cash += t.cash;
      acc[t.studentId].totals.checks += t.checks;
      acc[t.studentId].totals.atmMobile += t.atmMobile;
      acc[t.studentId].totals.paypal += t.paypal;
      acc[t.studentId].totals.total += t.total;
      
      // Add books
      t.books?.forEach(b => {
        if (b.price >= 20) {
          acc[t.studentId].books.large += b.quantity;
        } else {
          acc[t.studentId].books.small += b.quantity;
        }
        acc[t.studentId].books.total += b.quantity;
      });
      
      return acc;
    }, {});
    
    // Group transactions by leader
    const leaderTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.leaderId]) {
        acc[t.leaderId] = {
          id: t.leaderId,
          name: t.leaderName,
          transactions: [],
          totals: { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 },
          books: { large: 0, small: 0, total: 0 },
          colporters: new Set()
        };
      }
      
      acc[t.leaderId].transactions.push(t);
      acc[t.leaderId].totals.cash += t.cash;
      acc[t.leaderId].totals.checks += t.checks;
      acc[t.leaderId].totals.atmMobile += t.atmMobile;
      acc[t.leaderId].totals.paypal += t.paypal;
      acc[t.leaderId].totals.total += t.total;
      acc[t.leaderId].colporters.add(t.studentId);
      
      // Add books
      t.books?.forEach(b => {
        if (b.price >= 20) {
          acc[t.leaderId].books.large += b.quantity;
        } else {
          acc[t.leaderId].books.small += b.quantity;
        }
        acc[t.leaderId].books.total += b.quantity;
      });
      
      return acc;
    }, {});
    
    // Convert colporters Set to array length
    Object.values(leaderTransactions).forEach(leader => {
      leader.colporterCount = leader.colporters.size;
      delete leader.colporters;
    });
    
    res.json({
      startDate,
      endDate,
      dailyTransactions,
      dailyTotals,
      weeklyTotals,
      booksByDay,
      weeklyBookTotals,
      colporters: Object.values(colporterTransactions),
      leaders: Object.values(leaderTransactions)
    });
  } catch (error) {
    console.error('Error getting weekly report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get monthly report
export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }
    
    // Calculate start and end dates for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    // Get transactions for the month
    const transactions = await db.query(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, t.created_at`,
      [startDate, endDate]
    );
    
    // Group transactions by week
    const weeklyTransactions = transactions.reduce((acc, t) => {
      // Get week number (1-5) within the month
      const day = new Date(t.date).getDate();
      const weekNum = Math.ceil(day / 7);
      const weekKey = `Week ${weekNum}`;
      
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      
      acc[weekKey].push(t);
      return acc;
    }, {});
    
    // Calculate weekly totals
    const weeklyTotals = {};
    
    Object.entries(weeklyTransactions).forEach(([week, txs]) => {
      weeklyTotals[week] = txs.reduce((acc, t) => {
        acc.cash += t.cash;
        acc.checks += t.checks;
        acc.atmMobile += t.atmMobile;
        acc.paypal += t.paypal;
        acc.total += t.total;
        return acc;
      }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    });
    
    // Calculate monthly totals
    const monthlyTotals = transactions.reduce((acc, t) => {
      acc.cash += t.cash;
      acc.checks += t.checks;
      acc.atmMobile += t.atmMobile;
      acc.paypal += t.paypal;
      acc.total += t.total;
      return acc;
    }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    
    // Get books for each transaction and calculate book totals
    const booksByWeek = {};
    const monthlyBookTotals = { large: 0, small: 0, total: 0 };
    
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
      
      // Get week number
      const day = new Date(transaction.date).getDate();
      const weekNum = Math.ceil(day / 7);
      const weekKey = `Week ${weekNum}`;
      
      // Add books to weekly totals
      if (!booksByWeek[weekKey]) {
        booksByWeek[weekKey] = { large: 0, small: 0, total: 0 };
      }
      
      books.forEach(b => {
        // Assuming books with price >= 20 are large books
        if (b.price >= 20) {
          booksByWeek[weekKey].large += b.quantity;
          monthlyBookTotals.large += b.quantity;
        } else {
          booksByWeek[weekKey].small += b.quantity;
          monthlyBookTotals.small += b.quantity;
        }
        booksByWeek[weekKey].total += b.quantity;
        monthlyBookTotals.total += b.quantity;
      });
    }
    
    // Group transactions by colporter
    const colporterTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.studentId]) {
        acc[t.studentId] = {
          id: t.studentId,
          name: t.studentName,
          leaderId: t.leaderId,
          leaderName: t.leaderName,
          transactions: [],
          totals: { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 },
          books: { large: 0, small: 0, total: 0 }
        };
      }
      
      acc[t.studentId].transactions.push(t);
      acc[t.studentId].totals.cash += t.cash;
      acc[t.studentId].totals.checks += t.checks;
      acc[t.studentId].totals.atmMobile += t.atmMobile;
      acc[t.studentId].totals.paypal += t.paypal;
      acc[t.studentId].totals.total += t.total;
      
      // Add books
      t.books?.forEach(b => {
        if (b.price >= 20) {
          acc[t.studentId].books.large += b.quantity;
        } else {
          acc[t.studentId].books.small += b.quantity;
        }
        acc[t.studentId].books.total += b.quantity;
      });
      
      return acc;
    }, {});
    
    // Group transactions by leader
    const leaderTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.leaderId]) {
        acc[t.leaderId] = {
          id: t.leaderId,
          name: t.leaderName,
          transactions: [],
          totals: { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 },
          books: { large: 0, small: 0, total: 0 },
          colporters: new Set()
        };
      }
      
      acc[t.leaderId].transactions.push(t);
      acc[t.leaderId].totals.cash += t.cash;
      acc[t.leaderId].totals.checks += t.checks;
      acc[t.leaderId].totals.atmMobile += t.atmMobile;
      acc[t.leaderId].totals.paypal += t.paypal;
      acc[t.leaderId].totals.total += t.total;
      acc[t.leaderId].colporters.add(t.studentId);
      
      // Add books
      t.books?.forEach(b => {
        if (b.price >= 20) {
          acc[t.leaderId].books.large += b.quantity;
        } else {
          acc[t.leaderId].books.small += b.quantity;
        }
        acc[t.leaderId].books.total += b.quantity;
      });
      
      return acc;
    }, {});
    
    // Convert colporters Set to array length
    Object.values(leaderTransactions).forEach(leader => {
      leader.colporterCount = leader.colporters.size;
      delete leader.colporters;
    });
    
    res.json({
      year,
      month,
      startDate,
      endDate,
      weeklyTransactions,
      weeklyTotals,
      monthlyTotals,
      booksByWeek,
      monthlyBookTotals,
      colporters: Object.values(colporterTransactions),
      leaders: Object.values(leaderTransactions)
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
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Check if colporter exists
    const colporter = await db.getOne(
      `SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name, 
       c.school, c.age
       FROM people p
       JOIN colporters c ON p.id = c.id
       WHERE p.id = ? AND p.person_type = 'COLPORTER'`,
      [id]
    );
    
    if (!colporter) {
      return res.status(404).json({ message: 'Colporter not found' });
    }
    
    // Get transactions for the colporter
    const transactions = await db.query(
      `SELECT t.id, t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status
       FROM transactions t
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.student_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date`,
      [id, startDate, endDate]
    );
    
    // Get books for each transaction
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
    }
    
    // Group transactions by date
    const dailyTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.date]) {
        acc[t.date] = [];
      }
      acc[t.date].push(t);
      return acc;
    }, {});
    
    // Calculate daily totals
    const dailyTotals = {};
    
    Object.entries(dailyTransactions).forEach(([date, txs]) => {
      dailyTotals[date] = txs.reduce((acc, t) => {
        acc.cash += t.cash;
        acc.checks += t.checks;
        acc.atmMobile += t.atmMobile;
        acc.paypal += t.paypal;
        acc.total += t.total;
        return acc;
      }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    });
    
    // Calculate overall totals
    const totals = transactions.reduce((acc, t) => {
      acc.cash += t.cash;
      acc.checks += t.checks;
      acc.atmMobile += t.atmMobile;
      acc.paypal += t.paypal;
      acc.total += t.total;
      return acc;
    }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    
    // Calculate book totals
    const bookTotals = { large: 0, small: 0, total: 0 };
    const booksByDate = {};
    
    transactions.forEach(t => {
      if (!booksByDate[t.date]) {
        booksByDate[t.date] = { large: 0, small: 0, total: 0 };
      }
      
      t.books?.forEach(b => {
        if (b.price >= 20) {
          booksByDate[t.date].large += b.quantity;
          bookTotals.large += b.quantity;
        } else {
          booksByDate[t.date].small += b.quantity;
          bookTotals.small += b.quantity;
        }
        booksByDate[t.date].total += b.quantity;
        bookTotals.total += b.quantity;
      });
    });
    
    // Get charges for the colporter
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status,
       c.charge_date as date, CONCAT(p.first_name, ' ', p.last_name) as appliedByName
       FROM charges c
       JOIN users u ON c.applied_by = u.id
       JOIN people p ON u.person_id = p.id
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date`,
      [id, startDate, endDate]
    );
    
    // Calculate charges total
    const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get cash advances for the colporter
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.status,
       ca.week_start_date as startDate, ca.week_end_date as endDate,
       ca.request_date as requestDate, ca.approved_date as approvedDate,
       CONCAT(p.first_name, ' ', p.last_name) as approvedByName
       FROM cash_advances ca
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people p ON u.person_id = p.id
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date`,
      [id, startDate, endDate]
    );
    
    // Calculate advances total
    const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Calculate earnings
    const colporterPercentage = financialConfig?.colporter_percentage || 50;
    const earnings = totals.total * (colporterPercentage / 100);
    const netEarnings = earnings - chargesTotal - advancesTotal;
    
    res.json({
      colporter,
      startDate,
      endDate,
      transactions,
      dailyTransactions,
      dailyTotals,
      totals,
      bookTotals,
      booksByDate,
      charges,
      chargesTotal,
      advances,
      advancesTotal,
      colporterPercentage,
      earnings,
      netEarnings
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
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Check if leader exists
    const leader = await db.getOne(
      `SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name, 
       l.institution
       FROM people p
       JOIN leaders l ON p.id = l.id
       WHERE p.id = ? AND p.person_type = 'LEADER'`,
      [id]
    );
    
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }
    
    // Get transactions for the leader's team
    const transactions = await db.query(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       WHERE t.leader_id = ?
       AND t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date, sp.first_name, sp.last_name`,
      [id, startDate, endDate]
    );
    
    // Get books for each transaction
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
    }
    
    // Group transactions by date
    const dailyTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.date]) {
        acc[t.date] = [];
      }
      acc[t.date].push(t);
      return acc;
    }, {});
    
    // Calculate daily totals
    const dailyTotals = {};
    
    Object.entries(dailyTransactions).forEach(([date, txs]) => {
      dailyTotals[date] = txs.reduce((acc, t) => {
        acc.cash += t.cash;
        acc.checks += t.checks;
        acc.atmMobile += t.atmMobile;
        acc.paypal += t.paypal;
        acc.total += t.total;
        return acc;
      }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    });
    
    // Calculate overall totals
    const totals = transactions.reduce((acc, t) => {
      acc.cash += t.cash;
      acc.checks += t.checks;
      acc.atmMobile += t.atmMobile;
      acc.paypal += t.paypal;
      acc.total += t.total;
      return acc;
    }, { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 });
    
    // Calculate book totals
    const bookTotals = { large: 0, small: 0, total: 0 };
    const booksByDate = {};
    
    transactions.forEach(t => {
      if (!booksByDate[t.date]) {
        booksByDate[t.date] = { large: 0, small: 0, total: 0 };
      }
      
      t.books?.forEach(b => {
        if (b.price >= 20) {
          booksByDate[t.date].large += b.quantity;
          bookTotals.large += b.quantity;
        } else {
          booksByDate[t.date].small += b.quantity;
          bookTotals.small += b.quantity;
        }
        booksByDate[t.date].total += b.quantity;
        bookTotals.total += b.quantity;
      });
    });
    
    // Group transactions by colporter
    const colporterTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.studentId]) {
        acc[t.studentId] = {
          id: t.studentId,
          name: t.studentName,
          transactions: [],
          totals: { cash: 0, checks: 0, atmMobile: 0, paypal: 0, total: 0 },
          books: { large: 0, small: 0, total: 0 }
        };
      }
      
      acc[t.studentId].transactions.push(t);
      acc[t.studentId].totals.cash += t.cash;
      acc[t.studentId].totals.checks += t.checks;
      acc[t.studentId].totals.atmMobile += t.atmMobile;
      acc[t.studentId].totals.paypal += t.paypal;
      acc[t.studentId].totals.total += t.total;
      
      // Add books
      t.books?.forEach(b => {
        if (b.price >= 20) {
          acc[t.studentId].books.large += b.quantity;
        } else {
          acc[t.studentId].books.small += b.quantity;
        }
        acc[t.studentId].books.total += b.quantity;
      });
      
      return acc;
    }, {});
    
    // Get charges for the leader
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category, c.status,
       c.charge_date as date, CONCAT(p.first_name, ' ', p.last_name) as appliedByName
       FROM charges c
       JOIN users u ON c.applied_by = u.id
       JOIN people p ON u.person_id = p.id
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date`,
      [id, startDate, endDate]
    );
    
    // Calculate charges total
    const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get cash advances for the leader
    const advances = await db.query(
      `SELECT ca.id, ca.advance_amount as amount, ca.status,
       ca.week_start_date as startDate, ca.week_end_date as endDate,
       ca.request_date as requestDate, ca.approved_date as approvedDate,
       CONCAT(p.first_name, ' ', p.last_name) as approvedByName
       FROM cash_advances ca
       LEFT JOIN users u ON ca.approved_by = u.id
       LEFT JOIN people p ON u.person_id = p.id
       WHERE ca.person_id = ?
       AND ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date`,
      [id, startDate, endDate]
    );
    
    // Calculate advances total
    const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = (SELECT id FROM programs WHERE is_active = TRUE LIMIT 1)'
    );
    
    // Calculate earnings
    const leaderPercentage = financialConfig?.leader_percentage || 15;
    const earnings = totals.total * (leaderPercentage / 100);
    const netEarnings = earnings - chargesTotal - advancesTotal;
    
    // Get unique colporter count
    const uniqueColporters = new Set(transactions.map(t => t.studentId));
    
    res.json({
      leader,
      startDate,
      endDate,
      transactions,
      dailyTransactions,
      dailyTotals,
      totals,
      bookTotals,
      booksByDate,
      colporters: Object.values(colporterTransactions),
      colporterCount: uniqueColporters.size,
      charges,
      chargesTotal,
      advances,
      advancesTotal,
      leaderPercentage,
      earnings,
      netEarnings
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
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get financial configuration
    const financialConfig = await db.getOne(
      'SELECT * FROM program_financial_config WHERE program_id = ?',
      [program.id]
    );
    
    // Get all approved transactions
    const transactions = await db.query(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.transaction_date BETWEEN ? AND ?
       AND t.status = 'APPROVED'
       ORDER BY t.transaction_date`,
      [startDate, endDate]
    );
    
    // Get books for each transaction
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, b.category, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );
      
      transaction.books = books;
    }
    
    // Calculate total donations
    const totalDonations = transactions.reduce((sum, t) => sum + t.total, 0);
    
    // Get all applied charges
    const charges = await db.query(
      `SELECT c.id, c.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, c.amount, c.reason, c.category,
       c.charge_date as date
       FROM charges c
       JOIN people p ON c.person_id = p.id
       WHERE c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date`,
      [startDate, endDate]
    );
    
    // Calculate total fines
    const totalFines = charges.reduce((sum, c) => sum + c.amount, 0);
    
    // Get all approved cash advances
    const advances = await db.query(
      `SELECT ca.id, ca.person_id as personId, CONCAT(p.first_name, ' ', p.last_name) as personName,
       p.person_type as personType, ca.advance_amount as amount,
       ca.week_start_date as startDate, ca.week_end_date as endDate
       FROM cash_advances ca
       JOIN people p ON ca.person_id = p.id
       WHERE ca.week_start_date BETWEEN ? AND ?
       AND ca.status = 'APPROVED'
       ORDER BY ca.week_start_date`,
      [startDate, endDate]
    );
    
    // Calculate total advances
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    
    // Get all program expenses
    const expenses = await db.query(
      `SELECT e.id, e.leader_id as leaderId, 
       CASE WHEN e.leader_id IS NULL THEN 'Program' ELSE CONCAT(p.first_name, ' ', p.last_name) END as leaderName,
       e.amount, e.motivo, e.category, e.expense_date as date
       FROM expenses e
       LEFT JOIN people p ON e.leader_id = p.id
       WHERE e.expense_date BETWEEN ? AND ?
       ORDER BY e.expense_date`,
      [startDate, endDate]
    );
    
    // Calculate total program expenses
    const programExpenses = expenses
      .filter(e => e.leaderId === null)
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate distribution amounts
    const colporterPercentage = financialConfig?.colporter_percentage || 50;
    const leaderPercentage = financialConfig?.leader_percentage || 15;
    
    const colporterAmount = totalDonations * (colporterPercentage / 100);
    const leaderAmount = totalDonations * (leaderPercentage / 100);
    
    // Calculate net profit
    const totalIncome = totalDonations + totalFines;
    const totalExpenses = totalAdvances + programExpenses;
    const totalDistribution = colporterAmount + leaderAmount;
    const netProfit = totalIncome - totalExpenses - totalDistribution;
    
    // Group transactions by colporter
    const colporterTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.studentId]) {
        acc[t.studentId] = {
          id: t.studentId,
          name: t.studentName,
          leaderId: t.leaderId,
          leaderName: t.leaderName,
          donations: 0,
          fines: 0,
          advances: 0,
          earnings: 0
        };
      }
      
      acc[t.studentId].donations += t.total;
      
      return acc;
    }, {});
    
    // Add charges and advances to colporters
    charges.forEach(c => {
      if (c.personType === 'COLPORTER' && colporterTransactions[c.personId]) {
        colporterTransactions[c.personId].fines += c.amount;
      }
    });
    
    advances.forEach(a => {
      if (a.personType === 'COLPORTER' && colporterTransactions[a.personId]) {
        colporterTransactions[a.personId].advances += a.amount;
      }
    });
    
    // Calculate earnings for each colporter
    Object.values(colporterTransactions).forEach(c => {
      c.earnings = c.donations * (colporterPercentage / 100);
    });
    
    // Group transactions by leader
    const leaderTransactions = transactions.reduce((acc, t) => {
      if (!acc[t.leaderId]) {
        acc[t.leaderId] = {
          id: t.leaderId,
          name: t.leaderName,
          donations: 0,
          fines: 0,
          advances: 0,
          earnings: 0,
          colporters: new Set()
        };
      }
      
      acc[t.leaderId].donations += t.total;
      acc[t.leaderId].colporters.add(t.studentId);
      
      return acc;
    }, {});
    
    // Add charges and advances to leaders
    charges.forEach(c => {
      if (c.personType === 'LEADER' && leaderTransactions[c.personId]) {
        leaderTransactions[c.personId].fines += c.amount;
      }
    });
    
    advances.forEach(a => {
      if (a.personType === 'LEADER' && leaderTransactions[a.personId]) {
        leaderTransactions[a.personId].advances += a.amount;
      }
    });
    
    // Calculate earnings for each leader
    Object.values(leaderTransactions).forEach(l => {
      l.earnings = l.donations * (leaderPercentage / 100);
      l.colporterCount = l.colporters.size;
      delete l.colporters;
    });
    
    res.json({
      program,
      startDate,
      endDate,
      income: {
        donations: totalDonations,
        totalDonations
      },
      miscellaneous: {
        fines: totalFines,
        totalFines
      },
      expenses: {
        advances: totalAdvances,
        programExpenses,
        totalExpenses
      },
      distribution: {
        colporterPercentage,
        leaderPercentage,
        colporterAmount,
        leaderAmount
      },
      netProfit,
      colporters: Object.values(colporterTransactions),
      leaders: Object.values(leaderTransactions)
    });
  } catch (error) {
    console.error('Error getting program report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get individual earnings report
export const getIndividualEarningsReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Check if person exists
    const person = await db.getOne(
      `SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name, p.person_type as personType
       FROM people p
       WHERE p.id = ?`,
      [id]
    );
    
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }
    
    // Call stored procedure to calculate earnings
    await db.query('CALL calculate_earnings(?, ?, ?)', [id, startDate, endDate]);
    
    // Get earnings result
    const earningsResult = await db.getOne(
      `SELECT person_id as personId, person_name as personName, person_type as personType,
       start_date as startDate, end_date as endDate, total_sales as totalSales,
       earnings, total_charges as totalCharges, total_advances as totalAdvances
       FROM earnings_result
       WHERE person_id = ?`,
      [id]
    );
    
    if (!earningsResult) {
      return res.status(404).json({ message: 'No earnings data found' });
    }
    
    // Get daily earnings
    const dailyEarnings = await db.query(
      'SELECT date, amount FROM daily_earnings WHERE person_id = ? ORDER BY date',
      [id]
    );
    
    // Format daily earnings as object
    const dailyEarningsObj = dailyEarnings.reduce((acc, day) => {
      acc[day.date] = day.amount;
      return acc;
    }, {});
    
    // Get charges
    const charges = await db.query(
      `SELECT c.id, c.amount, c.reason, c.description, c.category,
       c.charge_date as date, CONCAT(p.first_name, ' ', p.last_name) as appliedByName
       FROM charges c
       JOIN users u ON c.applied_by = u.id
       JOIN people p ON u.person_id = p.id
       WHERE c.person_id = ?
       AND c.charge_date BETWEEN ? AND ?
       AND c.status = 'APPLIED'
       ORDER BY c.charge_date`,
      [id, startDate, endDate]
    );
    
    // Calculate net amount
    const netAmount = earningsResult.earnings - earningsResult.totalCharges - earningsResult.totalAdvances;
    
    res.json({
      person,
      startDate,
      endDate,
      totalSales: earningsResult.totalSales,
      earnings: earningsResult.earnings,
      totalCharges: earningsResult.totalCharges,
      totalAdvances: earningsResult.totalAdvances,
      netAmount,
      dailyEarnings: dailyEarningsObj,
      charges
    });
  } catch (error) {
    console.error('Error getting individual earnings report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New endpoints for dashboard
export const getSalesHistory = async (req, res) => {
  try {
    const { userId, period } = req.params;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
      default:
        // For 'all', get the program start date
        const program = await db.getOne(
          'SELECT start_date FROM programs WHERE is_active = TRUE'
        );
        if (program) {
          startDate = new Date(program.start_date);
        } else {
          // Default to 6 months if no program
          startDate.setMonth(endDate.getMonth() - 6);
        }
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get daily sales data
    let salesData;
    
    // If user is a colporter, get their transactions
    // If user is a leader or admin, get all transactions they're responsible for
    const user = await db.getOne(
      `SELECT u.id, u.role, u.person_id, p.person_type
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'VIEWER' && user.person_type === 'COLPORTER') {
      // Colporter - get their own transactions
      salesData = await db.query(
        `SELECT t.transaction_date as date, SUM(t.total) as amount
         FROM transactions t
         WHERE t.student_id = ?
         AND t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         GROUP BY t.transaction_date
         ORDER BY t.transaction_date`,
        [user.person_id, startDateStr, endDateStr]
      );
    } else if (user.role === 'SUPERVISOR' && user.person_type === 'LEADER') {
      // Leader - get transactions where they are the leader
      salesData = await db.query(
        `SELECT t.transaction_date as date, SUM(t.total) as amount
         FROM transactions t
         WHERE t.leader_id = ?
         AND t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         GROUP BY t.transaction_date
         ORDER BY t.transaction_date`,
        [user.person_id, startDateStr, endDateStr]
      );
    } else {
      // Admin or other role - get all transactions
      salesData = await db.query(
        `SELECT t.transaction_date as date, SUM(t.total) as amount
         FROM transactions t
         WHERE t.transaction_date BETWEEN ? AND ?
         AND t.status = 'APPROVED'
         GROUP BY t.transaction_date
         ORDER BY t.transaction_date`,
        [startDateStr, endDateStr]
      );
    }
    
    res.json(salesData);
  } catch (error) {
    console.error('Error getting sales history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFinancialGoals = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get user
    const user = await db.getOne(
      `SELECT u.id, u.role, u.person_id, p.person_type
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate today's date and date ranges
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate week start (Monday) and end (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    // Calculate month start and end
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    
    // Get sales data for different periods
    let dailySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let programSales = 0;
    
    if (user.role === 'VIEWER' && user.person_type === 'COLPORTER') {
      // Colporter - get their own transactions
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.student_id = ?
         AND t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr, user.person_id]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    } else if (user.role === 'SUPERVISOR' && user.person_type === 'LEADER') {
      // Leader - get transactions where they are the leader
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.leader_id = ?
         AND t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr, user.person_id]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    } else {
      // Admin or other role - get all transactions
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    }
    
    // Create goal objects
    const goals = [
      {
        id: 'daily',
        userId,
        amount: program.financial_goal / 120, // Rough estimate for daily goal
        achieved: dailySales,
        startDate: todayStr,
        endDate: todayStr,
        type: 'DAILY'
      },
      {
        id: 'weekly',
        userId,
        amount: program.financial_goal / 17, // Rough estimate for weekly goal
        achieved: weeklySales,
        startDate: weekStartStr,
        endDate: weekEndStr,
        type: 'WEEKLY'
      },
      {
        id: 'monthly',
        userId,
        amount: program.financial_goal / 4, // Rough estimate for monthly goal
        achieved: monthlySales,
        startDate: monthStartStr,
        endDate: monthEndStr,
        type: 'MONTHLY'
      }
    ];
    
    res.json(goals);
  } catch (error) {
    console.error('Error getting financial goals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFinancialSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get active program
    const program = await db.getOne(
      'SELECT * FROM programs WHERE is_active = TRUE'
    );
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    // Get user
    const user = await db.getOne(
      `SELECT u.id, u.role, u.person_id, p.person_type
       FROM users u
       LEFT JOIN people p ON u.person_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate today's date and date ranges
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate week start (Monday) and end (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    // Calculate month start and end
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    
    // Get sales data for different periods
    let dailySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let programSales = 0;
    
    if (user.role === 'VIEWER' && user.person_type === 'COLPORTER') {
      // Colporter - get their own transactions
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.student_id = ?
         AND t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr, user.person_id]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    } else if (user.role === 'SUPERVISOR' && user.person_type === 'LEADER') {
      // Leader - get transactions where they are the leader
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.leader_id = ?
         AND t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr, user.person_id]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    } else {
      // Admin or other role - get all transactions
      const salesData = await db.query(
        `SELECT 
          SUM(CASE WHEN t.transaction_date = ? THEN t.total ELSE 0 END) as daily,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as weekly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as monthly,
          SUM(CASE WHEN t.transaction_date BETWEEN ? AND ? THEN t.total ELSE 0 END) as program
         FROM transactions t
         WHERE t.status = 'APPROVED'`,
        [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, program.start_date, todayStr]
      );
      
      if (salesData.length > 0) {
        dailySales = salesData[0].daily || 0;
        weeklySales = salesData[0].weekly || 0;
        monthlySales = salesData[0].monthly || 0;
        programSales = salesData[0].program || 0;
      }
    }
    
    // Create summary object
    const summary = {
      totalSales: programSales,
      goal: program.financial_goal,
      achieved: programSales,
      remaining: program.financial_goal - programSales,
      dailySales,
      weeklySales,
      monthlySales
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

