import { Router } from 'express';
import { 
  addOrUpdateMeal, 
  getMeals, 
  deleteMemberMeals, 
  deleteAllMeals 
} from '../controllers/meal.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .post(addOrUpdateMeal)
  .get(getMeals);

router.delete('/member/:userId', deleteMemberMeals);
router.delete('/all', deleteAllMeals);

export default router;