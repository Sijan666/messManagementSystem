import { User } from '../models/user.model.js';
import { generateToken } from '../utils/token.util.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name, email, and password are required.'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'An account with this email address already exists.'
      });
    }

    const assignedRole = role === 'Manager' ? 'Manager' : 'Member';

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      status: 'active'
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Registration failed.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact the manager.'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Login failed.'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve profile.'
    });
  }
};

export const getAllMembers = async (req, res) => {
  try {
    const members = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({
      status: 'success',
      data: {
        members
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch members.'
    });
  }
};
