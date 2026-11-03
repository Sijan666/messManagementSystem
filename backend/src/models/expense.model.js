import { Schema, model } from 'mongoose';

const expenseSchema = new Schema(
  {
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: {
        values: ['Bazaar', 'Utility', 'House Rent', 'Personal'],
        message: 'Category must be Bazaar, Utility, House Rent, or Personal'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be greater than or equal to 0']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    uploadedReceipt: {
      type: String,
      default: null
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    exemptedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

export const Expense = model('Expense', expenseSchema);