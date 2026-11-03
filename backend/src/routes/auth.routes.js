import { Router } from 'express';
import { register, login, getProfile, getAllMembers } from '../controllers/auth.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.get('/members', protect, authorize('Manager'), getAllMembers);

export default router;
