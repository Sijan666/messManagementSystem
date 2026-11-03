import { Router } from 'express';
import { createExpense, getExpenses, deleteExpense } from '../controllers/expense.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { uploadReceipt } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(authorize('Manager'), uploadReceipt.single('receipt'), createExpense);

router.route('/:id')
  .delete(authorize('Manager'), deleteExpense);

export default router;
