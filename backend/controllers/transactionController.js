import * as db from "../config/database.js";

// Get all transactions
export const getTransactions = async (req, res) => {
  try {
    const { date, studentId, leaderId, status } = req.query;

    let query = `
      SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
      t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
      t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
      t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
      FROM transactions t
      JOIN people sp ON t.student_id = sp.id
      JOIN people lp ON t.leader_id = lp.id
    `;

    const params = [];
    const conditions = [];

    if (date) {
      console.log('Filtering transactions by date:', date);
      conditions.push("t.transaction_date = ?");
      params.push(date);
    }

    if (studentId) {
      conditions.push("t.student_id = ?");
      params.push(studentId);
    }

    if (leaderId) {
      conditions.push("t.leader_id = ?");
      params.push(leaderId);
    }

    if (status) {
      conditions.push("t.status = ?");
      params.push(status);
    } else {
      // If no status filter is provided, include all statuses
      // We don't filter by default anymore to show all transactions including REJECTED
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY t.transaction_date DESC, t.created_at DESC";

    const transactions = await db.query(query, params);

    // Get books for each transaction
    for (const transaction of transactions) {
      const books = await db.query(
        `SELECT tb.book_id as id, b.title, tb.price, tb.quantity
         FROM transaction_books tb
         JOIN books b ON tb.book_id = b.id
         WHERE tb.transaction_id = ?`,
        [transaction.id]
      );

      transaction.books = books;
    }

    res.json(transactions);
  } catch (error) {
    console.error("Error getting transactions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await db.getOne(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.id = ?`,
      [id]
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Get books for the transaction
    const books = await db.query(
      `SELECT tb.book_id as id, b.title, tb.price, tb.quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       WHERE tb.transaction_id = ?`,
      [id]
    );

    transaction.books = books;

    res.json(transaction);
  } catch (error) {
    console.error("Error getting transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new transaction
export const createTransaction = async (req, res) => {
  try {
    const {
      studentId,
      leaderId,
      cash,
      checks,
      atmMobile,
      paypal,
      date,
      books,
    } = req.body;

    const userId = req.user.id;

    // Check if student already has a transaction for this date
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE student_id = ? AND transaction_date = ? AND (status = 'PENDING' OR status = 'APPROVED')",
      [studentId, date]
    );

    if (existingTransaction) {
      return res.status(400).json({
        message: "Student already has a transaction for this date",
      });
    }

    // Calculate total
    const total =
      (cash || 0) + (checks || 0) + (atmMobile || 0) + (paypal || 0);

    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Insert transaction
      const [transactionResult] = await connection.execute(
        "INSERT INTO transactions (student_id, leader_id, cash, checks, atm_mobile, paypal, total, transaction_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          studentId,
          leaderId,
          cash || 0,
          checks || 0,
          atmMobile || 0,
          paypal || 0,
          total,
          date,
          "PENDING",
          userId,
        ]
      );

      const transactionId = transactionResult.insertId;

      // Insert books
      if (books && books.length > 0) {
        for (const book of books) {
          await connection.execute(
            "INSERT INTO transaction_books (transaction_id, book_id, quantity, price) VALUES (?, ?, ?, ?)",
            [transactionId, book.id, book.quantity, book.price]
          );
        }
      }

      return { transactionId };
    });

    // Get the created transaction
    const transaction = await db.getOne(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.id = ?`,
      [result.transactionId]
    );

    // Get books for the transaction
    const transactionBooks = await db.query(
      `SELECT tb.book_id as id, b.title, tb.price, tb.quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       WHERE tb.transaction_id = ?`,
      [result.transactionId]
    );

    transaction.books = transactionBooks;

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentId,
      leaderId,
      cash,
      checks,
      atmMobile,
      paypal,
      date,
      status,
      books,
    } = req.body;

    // Check if transaction exists
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );
    console.log(existingTransaction);
    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // If changing date or student, check if student already has a transaction for that date
    if (
      (date && date !== existingTransaction.transaction_date) ||
      (studentId && studentId !== existingTransaction.student_id)
    ) {
      const checkStudentId = studentId || existingTransaction.student_id;
      const checkDate = date || existingTransaction.transaction_date;

      const duplicateTransaction = await db.getOne(
        "SELECT * FROM transactions WHERE student_id = ? AND transaction_date = ? AND id != ?",
        [checkStudentId, checkDate, id]
      );

      if (duplicateTransaction) {
        return res.status(400).json({
          message: "Student already has a transaction for this date",
        });
      }
    }

    // Calculate total
    const newCash = cash !== undefined ? cash : existingTransaction.cash;
    const newChecks =
      checks !== undefined ? checks : existingTransaction.checks;
    const newAtmMobile =
      atmMobile !== undefined ? atmMobile : existingTransaction.atm_mobile;
    const newPaypal =
      paypal !== undefined ? paypal : existingTransaction.paypal;
    const total = newCash + newChecks + newAtmMobile + newPaypal;
    // Start transaction
    await db.transaction(async (connection) => {
      // Update transaction
      await connection.execute(
        "UPDATE transactions SET student_id = ?, leader_id = ?, cash = ?, checks = ?, atm_mobile = ?, paypal = ?, total = ?, transaction_date = ?, status = ?, updated_at = NOW() WHERE id = ?",
        [
          studentId || existingTransaction.student_id,
          leaderId || existingTransaction.leader_id,
          newCash,
          newChecks,
          newAtmMobile,
          newPaypal,
          total,
          date || existingTransaction.transaction_date,
          status || existingTransaction.status,
          id,
        ]
      );

      // If books are provided, update them
      if (books) {
        // Delete existing books
        await connection.execute(
          "DELETE FROM transaction_books WHERE transaction_id = ?",
          [id]
        );

        // Insert new books
        for (const book of books) {
          await connection.execute(
            "INSERT INTO transaction_books (transaction_id, book_id, quantity, price) VALUES (?, ?, ?, ?)",
            [id, book.id, book.quantity, book.price]
          );
        }
      }
    });

    // Get the updated transaction
    const updatedTransaction = await db.getOne(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.id = ?`,
      [id]
    );

    // Get books for the transaction
    const transactionBooks = await db.query(
      `SELECT tb.book_id as id, b.title, tb.price, tb.quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       WHERE tb.transaction_id = ?`,
      [id]
    );

    updatedTransaction.books = transactionBooks;

    res.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Start transaction
    await db.transaction(async (connection) => {
      // Delete transaction books
      await connection.execute(
        "DELETE FROM transaction_books WHERE transaction_id = ?",
        [id]
      );

      // Delete transaction
      await connection.execute("DELETE FROM transactions WHERE id = ?", [id]);
    });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve transaction
export const approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (existingTransaction.status === "APPROVED") {
      return res
        .status(400)
        .json({ message: "Transaction is already approved" });
    }

    // Start transaction
    await db.transaction(async (connection) => {
      // Update transaction status
      await connection.execute(
        "UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?",
        ["APPROVED", id]
      );

      // Get transaction books
      const [books] = await connection.execute(
        "SELECT book_id, quantity FROM transaction_books WHERE transaction_id = ?",
        [id]
      );

      // Update book stock and sold counts
      for (const book of books) {
        await connection.execute(
          "UPDATE books SET sold = sold + ? WHERE id = ?",
          [book.quantity, book.book_id]
        );
      }
    });

    // Get the updated transaction
    const updatedTransaction = await db.getOne(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      message: "Transaction approved successfully",
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("Error approving transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject transaction
export const rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (existingTransaction.status === "REJECTED") {
      return res
        .status(400)
        .json({ message: "Transaction is already rejected" });
    }

    // If transaction was approved, need to revert book counts
    if (existingTransaction.status === "APPROVED") {
      await db.transaction(async (connection) => {
        // Update transaction status
        await connection.execute(
          "UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?",
          ["REJECTED", id]
        );

        // Get transaction books
        const [books] = await connection.execute(
          "SELECT book_id, quantity FROM transaction_books WHERE transaction_id = ?",
          [id]
        );

        // Revert book sold counts
        for (const book of books) {
          await connection.execute(
            "UPDATE books SET sold = sold - ? WHERE id = ?",
            [book.quantity, book.book_id]
          );
        }
      });
    } else {
      // Just update status
      await db.update(
        "UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?",
        ["REJECTED", id]
      );
    }

    // Get the updated transaction
    const updatedTransaction = await db.getOne(
      `SELECT t.id, t.student_id as studentId, CONCAT(sp.first_name, ' ', sp.last_name) as studentName,
       t.leader_id as leaderId, CONCAT(lp.first_name, ' ', lp.last_name) as leaderName,
       t.cash, t.checks, t.atm_mobile as atmMobile, t.paypal, t.total,
       t.transaction_date as date, t.status, t.created_at as createdAt, t.updated_at as updatedAt
       FROM transactions t
       JOIN people sp ON t.student_id = sp.id
       JOIN people lp ON t.leader_id = lp.id
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      message: "Transaction rejected successfully",
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("Error rejecting transaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get transaction books
export const getTransactionBooks = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await db.getOne(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Get books for the transaction
    const books = await db.query(
      `SELECT tb.book_id as id, b.title, b.category, b.image_url as imageUrl, tb.price, tb.quantity
       FROM transaction_books tb
       JOIN books b ON tb.book_id = b.id
       WHERE tb.transaction_id = ?`,
      [id]
    );

    res.json(books);
  } catch (error) {
    console.error("Error getting transaction books:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};