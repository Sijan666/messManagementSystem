import { Router } from 'express';
import { createDeposit, getDeposits, updateDepositStatus } from '../controllers/deposit.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .post(createDeposit)
  .get(getDeposits);

router.route('/:id/status')
  .patch(authorize('Manager'), updateDepositStatus);

export default router;
