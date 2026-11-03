import { Schema, model } from 'mongoose';

const mealSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    breakfast: {
      type: Number,
      default: 0,
      min: [0, 'Breakfast meal count cannot be negative']
    },
    lunch: {
      type: Number,
      default: 0,
      min: [0, 'Lunch meal count cannot be negative']
    },
    dinner: {
      type: Number,
      default: 0,
      min: [0, 'Dinner meal count cannot be negative']
    },
    guestMeals: {
      type: Number,
      default: 0,
      min: [0, 'Guest meal count cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

mealSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Meal = model('Meal', mealSchema);
