// server/src/utils/db.js

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MONGO_URI is not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
    });
    console.log(' Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };