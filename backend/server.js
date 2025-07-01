import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config/config.js';

// Import routes
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import peopleRoutes from './routes/people.js';
import transactionsRoutes from './routes/transactions.js';
import expensesRoutes from './routes/expenses.js';
import cashAdvanceRoutes from './routes/cashAdvance.js';
import chargesRoutes from './routes/charges.js';
import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/users.js';
import programRoutes from './routes/program.js';
import setupRoutes from './routes/setup.js';
import dashboardRoutes from './routes/dashboard.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(process.env.NODE_ENV);
// Initialize express app
const app = express();
// Configure CORS with credentials
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://reachuaa.com', 'http://localhost:5173'] // Production frontend URL
    : ['http://localhost:5173', 'https://l9sxxsf4-3000.usw2.devtunnels.ms'],
    credentials: true // Allow cookies to be sent with requests
}));

// Increase payload size limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware
app.use(cookieParser()); // Parse cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/cash-advance', cashAdvanceRoutes);
app.use('/api/charges', chargesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/program', programRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Reach UAA API' });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});