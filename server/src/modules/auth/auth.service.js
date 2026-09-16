const jwt = require('jsonwebtoken');
const User = require('./user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'docuscreen_super_secure_jwt_secret_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const register = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    const error = new Error('A user with this email address already exists.');
    error.statusCode = 400;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const user = new User(userData);
  await user.save();

  const token = generateToken(user);
  return { user, token };
};

const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Please provide both email and password.');
    error.statusCode = 400;
    error.code = 'MISSING_CREDENTIALS';
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user);
  return { user, token };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  return user;
};

const updateProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (updateData.name) user.name = updateData.name;
  if (updateData.department) user.department = updateData.department;
  if (updateData.badgeNumber) user.badgeNumber = updateData.badgeNumber;

  if (updateData.currentPassword && updateData.newPassword) {
    const isMatch = await user.comparePassword(updateData.currentPassword);
    if (!isMatch) {
      const error = new Error('Current password does not match.');
      error.statusCode = 400;
      error.code = 'INCORRECT_CURRENT_PASSWORD';
      throw error;
    }
    if (updateData.newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters.');
      error.statusCode = 400;
      error.code = 'PASSWORD_TOO_SHORT';
      throw error;
    }
    user.password = updateData.newPassword;
  }

  await user.save();
  return user;
};

// Seed default admin officer if database has no users
const seedDefaultUser = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Seeding default admin officer account...');
      const admin = new User({
        name: 'Inspector John Doe',
        email: 'admin@docuscreen.local',
        password: 'password', // will be hashed by pre-save hook
        role: 'admin',
        badgeNumber: 'DS-9001',
        department: 'Federal Document Verification Unit',
      });
      await admin.save();
      console.log('Default officer created: admin@docuscreen.local / password');
    }
  } catch (err) {
    console.error('Error seeding default user:', err.message);
  }
};

module.exports = {
  generateToken,
  register,
  login,
  getMe,
  updateProfile,
  seedDefaultUser,
  JWT_SECRET,
};
