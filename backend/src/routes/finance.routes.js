import { Router } from 'express';
import { getDashboardSummary, downloadSummaryPDF } from '../controllers/finance.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all finance routes
router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/export-pdf', downloadSummaryPDF);

export default router;