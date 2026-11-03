import { Router } from 'express';
import { downloadExpenseAndBazaarPDF } from '../controllers/expensePdf.controller.js';
import { protect } from '../middlewares/auth.middleware.js'; // restrictTo bad deya holo

const router = Router();

router.use(protect);

// Shudhu protect rakha holo, jekono authenticated user (ba manager) download korte parbe
router.get('/export-expense-pdf', downloadExpenseAndBazaarPDF);

export default router;