import mysql from 'mysql2/promise';
import { config } from './config.js';

// Create a connection pool
const pool = mysql.createPool({
  host: config.DB_HOST || '127.0.0.1',
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  port: config.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
// Set session timezone on connection
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '-05:00';", (err) => {
    if (err) {
      console.error('Error setting session timezone:', err.message);
    }
  });
});
// Helper function to check if a value is a valid date
const isValidDate = (value) => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return true; // Valid Date object
  }
  if (typeof value !== 'string') {
    return false; // Not a string, so not a date string
  }
  const date = new Date(value);
  return !isNaN(date.getTime()); // Valid date string
};

// Helper function to convert string numbers to actual numbers
const convertStringToNumber = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(convertStringToNumber);
  }

  if (typeof obj === 'object') {
    // Handle empty objects or invalid date-like objects
    if (Object.keys(obj).length === 0) {
      return obj; // Preserve empty objects (e.g., {})
    }

    const result = {};
    for (const key in obj) {
      // Skip Date objects and fields that are likely dates or valid date strings
      if (
        obj[key] instanceof Date ||
        (typeof obj[key] === 'string' &&
          (key.toLowerCase().includes('date') ||
           key.toLowerCase().includes('time') ||
           isValidDate(obj[key])))
      ) {
        result[key] = obj[key]; // Keep as-is (Date or string)
      }
      // Convert numeric strings to numbers for specific fields
      else if (
        (typeof obj[key] === 'string' && !isNaN(obj[key]) && obj[key].trim() !== '') ||
        typeof obj[key] === 'number'
      ) {
        if (
          key === 'total' || key === 'cash' || key === 'checks' ||
          key === 'atmMobile' || key === 'paypal' || key === 'amount' ||
          key === 'price' || key === 'quantity' || key === 'stock' ||
          key === 'sold' || key === 'totalSales' || key === 'advanceAmount' ||
          key === 'transactionCount' || key === 'discrepancy' ||
          key === 'system_count' || key === 'manual_count'
        ) {
          result[key] = Number(obj[key]); // Convert to number
        } else {
          result[key] = obj[key]; // Keep as-is
        }
      } else {
        result[key] = convertStringToNumber(obj[key]); // Recurse for nested objects
      }
    }
    return result;
  }

  return obj;
};

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    return false;
  }
}

// Execute a query
export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return convertStringToNumber(results);
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Get a single row
export async function getOne(sql, params) {
  try {
    const results = await query(sql, params);
    return results[0] ? convertStringToNumber(results[0]) : null;
  } catch (error) {
    throw error;
  }
}

// Insert a row and return the inserted ID
export async function insert(sql, params) {
  try {
    const [result] = await pool.execute(sql, params);
    return result.insertId;
  } catch (error) {
    console.error('Database insert error:', error.message);
    throw error;
  }
}

// Update rows
export async function update(sql, params) {
  try {
    const [result] = await pool.execute(sql, params);
    return result.affectedRows;
  } catch (error) {
    console.error('Database update error:', error.message);
    throw error;
  }
}

// Delete rows
export async function remove(sql, params) {
  try {
    const [result] = await pool.execute(sql, params);
    return result.affectedRows;
  } catch (error) {
    console.error('Database delete error:', error.message);
    throw error;
  }
}

// Execute a transaction
export async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  testConnection,
  query,
  getOne,
  insert,
  update,
  remove,
  transaction
};