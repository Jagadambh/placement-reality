const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
