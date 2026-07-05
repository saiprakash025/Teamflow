//test users

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const User = require('../models/User');

const USERS = [
  { name: 'Sai Prakash', email: 'sai@test.com', password: 'password123', role: 'member' },
  { name: 'Rahul', email: 'rahul@test.com', password: 'password123', role: 'member' },
  { name: 'Priya', email: 'priya@test.com', password: 'password123', role: 'member' },
  { name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' },
];

async function seed() {
  await connectDB();

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`- Skipping ${u.email} (already exists)`);
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.password, salt);

    await User.create({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
    });

    console.log(`✓ Created ${u.email} (role: ${u.role})`);
  }

  console.log('\nDone. Login with any of these (password: password123):');
  USERS.forEach((u) => console.log(`  ${u.email}  [${u.role}]`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});