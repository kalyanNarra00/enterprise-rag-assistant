const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const mintToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
};

const formatUserPayload = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  department: user.department,
  status: user.status,
});

const signup = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: email, password, firstName, lastName.',
      });
    }

    const duplicate = await User.findOne({ email: email.toLowerCase() });
    if (duplicate) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUser = await User.create({
      email,
      passwordHash: password,
      firstName,
      lastName,
      role: role || 'employee',
      department,
    });

    const accessToken = mintToken(newUser._id);

    res.status(201).json({
      success: true,
      token: accessToken,
      user: formatUserPayload(newUser),
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Both email and password are required.' });
    }

    const account = await User.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    if (account.status !== 'active') {
      return res.status(401).json({ success: false, error: 'This account has been deactivated.' });
    }

    const credentialsValid = await account.comparePassword(password);
    if (!credentialsValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const accessToken = mintToken(account._id);

    await AuditLog.create({
      userId: account._id,
      userEmail: account.email,
      action: 'login',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      user: formatUserPayload(account),
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await User.findById(req.user._id).select('-passwordHash');
    if (!profile) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }
    res.status(200).json({ success: true, user: formatUserPayload(profile) });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, getMe };
