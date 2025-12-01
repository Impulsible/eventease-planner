const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  console.log('🔍 Registration started - Request body:', req.body);
  
  try {
    const { name, email, password, role } = req.body;

    console.log('📝 Step 1: Validating input data');
    // Check if user exists
    const userExists = await User.findOne({ email });
    console.log('✅ User exists check completed');
    
    if (userExists) {
      console.log('❌ User already exists with email:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    console.log('📝 Step 2: Creating user in database');
    // Create user - this will trigger the pre-save middleware for password hashing
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'guest'
    });
    console.log('✅ User created successfully with ID:', user._id);

    console.log('📝 Step 3: Generating JWT token');
    const token = generateToken(user._id);
    console.log('✅ Token generated successfully');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token
      }
    });
    console.log('🎉 Registration completed successfully');

  } catch (error) {
    console.error('💥 Registration error caught:', error);
    console.error('💥 Error name:', error.name);
    console.error('💥 Error message:', error.message);
    console.error('💥 Error code:', error.code);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.log('❌ Validation error:', messages);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // MongoDB duplicate key error
    if (error.code === 11000) {
      console.log('❌ Duplicate key error');
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // MongoDB connection error
    if (error.name === 'MongoServerError') {
      console.log('❌ MongoDB server error');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
    
    console.log('❌ Unknown server error');
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (user && await user.correctPassword(password)) {
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};