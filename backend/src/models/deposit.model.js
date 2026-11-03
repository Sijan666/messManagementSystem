import { Schema, model } from 'mongoose';

const depositSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Deposit amount must be at least 1']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    method: {
      type: String,
      required: [true, 'Deposit method is required'],
      enum: {
        values: ['Cash', 'Mobile Banking'],
        message: 'Deposit method must be Cash or Mobile Banking'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Deposit = model('Deposit', depositSchema);
