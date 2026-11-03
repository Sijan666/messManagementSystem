import { Meal } from '../models/meal.model.js';
import { normalizeDate } from '../utils/finance.util.js';

export const addOrUpdateMeal = async (req, res) => {
  try {
    const { userId, date, breakfast, lunch, dinner, guestMeals } = req.body;

    const targetUserId = req.user.role === 'Manager' && userId ? userId : req.user._id;

    if (!date) {
      return res.status(400).json({
        status: 'fail',
        message: 'Meal date is required.'
      });
    }

    const mealDate = normalizeDate(date);
    const currentDate = normalizeDate(new Date());

    if (req.user.role !== 'Manager') {
      if (mealDate < currentDate) {
        return res.status(400).json({
          status: 'fail',
          message: 'Cannot modify meal records for past dates.'
        });
      }

      if (mealDate.getTime() === currentDate.getTime()) {
        const currentHour = new Date().getHours();
        const cutoffHour = 20; // 8:00 PM cutoff for same-day modification
        if (currentHour >= cutoffHour) {
          return res.status(400).json({
            status: 'fail',
            message: 'Same-day meal updates cannot be processed after the 8:00 PM cutoff time.'
          });
        }
      }
    }

    const updatePayload = {
      breakfast: Math.max(0, Number(breakfast) || 0),
      lunch: Math.max(0, Number(lunch) || 0),
      dinner: Math.max(0, Number(dinner) || 0),
      guestMeals: Math.max(0, Number(guestMeals) || 0)
    };

    const meal = await Meal.findOneAndUpdate(
      { userId: targetUserId, date: mealDate },
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true }
    ).populate('userId', 'name email role');

    return res.status(200).json({
      status: 'success',
      message: 'Meal details recorded successfully.',
      data: { meal }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to save meal record.'
    });
  }
};

export const getMeals = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const filter = {};

    if (req.user.role === 'Manager') {
      if (userId) filter.userId = userId;
    } else {
      filter.userId = req.user._id;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = normalizeDate(startDate);
      if (endDate) filter.date.$lte = normalizeDate(endDate);
    }

    const meals = await Meal.find(filter)
      .populate('userId', 'name email role')
      .sort({ date: -1 });

    return res.status(200).json({
      status: 'success',
      results: meals.length,
      data: { meals }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve meal records.'
    });
  }
};

// Delete all meals for a specific member
export const deleteMemberMeals = async (req, res) => {
  try {
    const { userId } = req.params;
    await Meal.deleteMany({ userId });

    return res.status(200).json({
      status: 'success',
      message: 'Member meals removed successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete member meals.'
    });
  }
};

// Clear all meal records for everyone
export const deleteAllMeals = async (req, res) => {
  try {
    await Meal.deleteMany({});

    return res.status(200).json({
      status: 'success',
      message: 'All meal records cleared successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to clear meal records.'
    });
  }
};