import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { testConnection } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import peopleRoutes from './routes/people.js';
import bookRoutes from './routes/books.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import chargeRoutes from './routes/charges.js';
import cashAdvanceRoutes from './routes/cashAdvance.js';
import bibleStudyRoutes from './routes/bibleStudies.js';
import programRoutes from './routes/program.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import setupRoutes from './routes/setup.js';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Create Express app
const app = express();

// Set up middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Increase payload size limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Test database connection
testConnection()
  .then(connected => {
    if (!connected) {
      console.error('Database connection failed. Exiting...');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1);
  });

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/cash-advance', cashAdvanceRoutes);
app.use('/api/bible-studies', bibleStudyRoutes);
app.use('/api/program', programRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/setup', setupRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});