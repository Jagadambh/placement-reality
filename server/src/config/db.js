const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
    if (!process.env.MONGODB_URI) {
      console.warn(`[Database Warning] MONGODB_URI environment variable is not defined! Defaulting to local: ${uri}`);
    } else {
      console.log(`[Database] Connecting using provided MONGODB_URI...`);
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
