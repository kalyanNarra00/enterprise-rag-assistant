/**
 * Seed script: creates 6 demo users for the Enterprise RAG Assistant.
 *
 * Usage:
 *   node src/utils/seedUsers.js
 *
 * Requires MONGODB_URI in .env (or defaults to mongodb://localhost:27017/enterprise-rag).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const seedUsers = [
  {
    email: 'admin@enterprise.com',
    passwordHash: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    status: 'active',
  },
  {
    email: 'hr.manager@enterprise.com',
    passwordHash: 'hr123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'hr',
    department: 'HR',
    status: 'active',
  },
  {
    email: 'finance.analyst@enterprise.com',
    passwordHash: 'finance123',
    firstName: 'Mike',
    lastName: 'Chen',
    role: 'finance',
    department: 'Finance',
    status: 'active',
  },
  {
    email: 'it.admin@enterprise.com',
    passwordHash: 'it123',
    firstName: 'David',
    lastName: 'Kumar',
    role: 'it_admin',
    department: 'IT',
    status: 'active',
  },
  {
    email: 'ops.manager@enterprise.com',
    passwordHash: 'ops123',
    firstName: 'Lisa',
    lastName: 'Park',
    role: 'manager',
    department: 'Operations',
    status: 'active',
  },
  {
    email: 'employee@enterprise.com',
    passwordHash: 'emp123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Engineering',
    status: 'active',
  },
];

const seed = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-rag';

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Remove existing users with matching emails to allow re-running
    const emails = seedUsers.map((u) => u.email);
    await User.deleteMany({ email: { $in: emails } });
    console.log('Cleared existing seed users');

    // Insert each user individually so the pre-save hook hashes the password
    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`  Created: ${user.email} (${user.role} / ${user.department})`);
    }

    console.log(`\nSeeded ${seedUsers.length} users successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seed();
