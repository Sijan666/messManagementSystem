import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import mealRoutes from './routes/meal.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import depositRoutes from './routes/deposit.routes.js';
import financeRoutes from './routes/finance.routes.js';
import expensePdfRoutes from './routes/expensePdf.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Mess Management API is operational',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/meals', mealRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/deposits', depositRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/expenses', expensePdfRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Resource not found at ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;