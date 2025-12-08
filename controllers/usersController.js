const User = require('../models/User');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* -----------------------------------------------------
   JWT GENERATOR
----------------------------------------------------- */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/* -----------------------------------------------------
   VALIDATION: USER CREATION
----------------------------------------------------- */
const validateUserCreation = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters long');
  if (name && name.length > 50) errors.push('Name cannot exceed 50 characters');

  if (!email || !validator.isEmail(email)) errors.push('Valid email address is required');
  if (email && email.length > 100) errors.push('Email cannot exceed 100 characters');

  if (!password || password.length < 6) errors.push('Password must be at least 6 characters long');
  if (password && password.length > 128) errors.push('Password cannot exceed 128 characters');

  if (role && !['guest', 'organizer', 'admin'].includes(role))
    errors.push('Role must be guest, organizer, or admin');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/* -----------------------------------------------------
   VALIDATION: USER UPDATE
----------------------------------------------------- */
const validateUserUpdate = (req, res, next) => {
  const { name, email, role } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (name.trim().length < 2) errors.push('Name must be at least 2 characters long');
    if (name.length > 50) errors.push('Name cannot exceed 50 characters');
  }

  if (email !== undefined) {
    if (!validator.isEmail(email)) errors.push('Valid email address is required');
    if (email.length > 100) errors.push('Email cannot exceed 100 characters');
  }

  if (role !== undefined && !['guest', 'organizer', 'admin'].includes(role))
    errors.push('Role must be guest, organizer, or admin');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

/* -----------------------------------------------------
   REGISTER USER
----------------------------------------------------- */
const registerUser = async (req, res) => {
  console.log('🔍 Registration started:', req.body);

  try {
    const { name, email, password, role } = req.body;

    // Check for duplicate email
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('❌ Registration failed: Email already exists');
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Password hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'guest',
    });

    console.log('✅ User created:', user._id);

    // Token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error('💥 Registration error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

/* -----------------------------------------------------
   LOGIN USER
----------------------------------------------------- */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/* -----------------------------------------------------
   GET ALL USERS
----------------------------------------------------- */
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching users' });
  }
};

/* -----------------------------------------------------
   GET SINGLE USER
----------------------------------------------------- */
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    res.status(500).json({ success: false, message: 'Server error while fetching user' });
  }
};

/* -----------------------------------------------------
   UPDATE USER (with authorization + validation)
----------------------------------------------------- */
const updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const userId = req.params.id;

    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent non-admin users from modifying other users
    if (req.user._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }

    // Prevent duplicate email on update
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Prepare updates
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined && req.user.role === 'admin') updates.role = role;

    user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already exists' });

    res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

/* -----------------------------------------------------
   DELETE USER
----------------------------------------------------- */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    res.status(500).json({ success: false, message: 'Server error while deleting user' });
  }
};

/* -----------------------------------------------------
   EXPORT (CORRECTED - NO ARRAYS!)
----------------------------------------------------- */
module.exports = {
  // Controller functions
  registerUser,
  loginUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  
  // Validation middleware functions
  validateUserCreation,
  validateUserUpdate
};