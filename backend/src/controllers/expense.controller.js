import { Expense } from '../models/expense.model.js';
import { normalizeDate } from '../utils/finance.util.js';

export const createExpense = async (req, res) => {
  try {
    const { category, amount, date, description, assignedTo, exemptedUsers } = req.body;

    if (!category || amount === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'Category and amount are required.'
      });
    }

    let uploadedReceipt = null;
    if (req.file) {
      uploadedReceipt = `/uploads/${req.file.filename}`;
    }

    // Safely parse exemptedUsers (FormData sends arrays as JSON strings or multiple identical keys)
    let parsedExemptedUsers = [];
    if (exemptedUsers) {
      if (Array.isArray(exemptedUsers)) {
        parsedExemptedUsers = exemptedUsers;
      } else {
        try {
          parsedExemptedUsers = JSON.parse(exemptedUsers);
        } catch (e) {
          parsedExemptedUsers = [exemptedUsers]; // Fallback for a single string ID
        }
      }
    }

    const expense = await Expense.create({
      category,
      amount: Number(amount),
      date: date ? normalizeDate(date) : new Date(),
      uploadedReceipt,
      description: description || '',
      createdBy: req.user._id,
      assignedTo: category === 'Personal' && assignedTo ? assignedTo : null,
      exemptedUsers: category !== 'Personal' ? parsedExemptedUsers : []
    });

    return res.status(201).json({
      status: 'success',
      message: 'Expense added successfully.',
      data: { expense }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to record expense.'
    });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = normalizeDate(startDate);
      if (endDate) filter.date.$lte = normalizeDate(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name') // Fetch assigned member's name
      .populate('exemptedUsers', 'name') // Fetch exempted members' names
      .sort({ date: -1 });

    return res.status(200).json({
      status: 'success',
      results: expenses.length,
      data: { expenses }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve expenses.'
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        status: 'fail',
        message: 'Expense not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Expense removed successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete expense.'
    });
  }
};

// Expense update ba edit korar jonno notun function
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, date, description, assignedTo, exemptedUsers } = req.body;

    let parsedExemptedUsers = [];
    if (exemptedUsers) {
      if (Array.isArray(exemptedUsers)) {
        parsedExemptedUsers = exemptedUsers;
      } else {
        try {
          parsedExemptedUsers = JSON.parse(exemptedUsers);
        } catch (e) {
          parsedExemptedUsers = [exemptedUsers];
        }
      }
    }

    let updateData = {
      category,
      amount: Number(amount),
      date: date ? normalizeDate(date) : undefined,
      description: description || '',
      assignedTo: category === 'Personal' && assignedTo ? assignedTo : null,
      exemptedUsers: category !== 'Personal' ? parsedExemptedUsers : []
    };

    if (req.file) {
      updateData.uploadedReceipt = `/uploads/${req.file.filename}`;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name')
      .populate('exemptedUsers', 'name');

    if (!updatedExpense) {
      return res.status(404).json({
        status: 'fail',
        message: 'Expense record not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Expense updated successfully.',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update expense.'
    });
  }
};