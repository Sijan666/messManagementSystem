import { Deposit } from '../models/deposit.model.js';
import { normalizeDate } from '../utils/finance.util.js';

export const createDeposit = async (req, res) => {
  try {
    const { userId, amount, date, method, note } = req.body;

    const targetUserId = req.user.role === 'Manager' && userId ? userId : req.user._id;

    if (!amount || !method) {
      return res.status(400).json({
        status: 'fail',
        message: 'Amount and deposit method are required.'
      });
    }

    const deposit = await Deposit.create({
      userId: targetUserId,
      amount: Number(amount),
      date: date ? normalizeDate(date) : new Date(),
      method,
      status: req.user.role === 'Manager' ? 'approved' : 'pending',
      approvedBy: req.user.role === 'Manager' ? req.user._id : null,
      note: note || ''
    });

    const populatedDeposit = await Deposit.findById(deposit._id).populate('userId', 'name email role');

    return res.status(201).json({
      status: 'success',
      message: 'Deposit logged successfully.',
      data: { deposit: populatedDeposit }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to submit deposit.'
    });
  }
};

export const getDeposits = async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};

    if (req.user.role === 'Manager') {
      if (userId) filter.userId = userId;
    } else {
      filter.userId = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    const deposits = await Deposit.find(filter)
      .populate('userId', 'name email role')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });

    return res.status(200).json({
      status: 'success',
      results: deposits.length,
      data: { deposits }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve deposits.'
    });
  }
};

export const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Status must be either approved or rejected.'
      });
    }

    const deposit = await Deposit.findByIdAndUpdate(
      id,
      {
        status,
        approvedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!deposit) {
      return res.status(404).json({
        status: 'fail',
        message: 'Deposit record not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Deposit has been marked as ${status}.`,
      data: { deposit }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update deposit status.'
    });
  }
};
