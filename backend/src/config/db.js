import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri && process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
      const username = encodeURIComponent(process.env.MONGODB_USERNAME);
      const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
      const dbName = process.env.MONGODB_DBNAME || 'todo';
      mongoUri = `mongodb+srv://${username}:${password}@cluster0.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    }

    if (!mongoUri) {
      mongoUri = 'mongodb://127.0.0.1:27017/mess_management';
    }

    const connectionInstance = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.error(`Database connection warning: ${error.message}`);
    console.log('Server is continuing to run. Please verify your MongoDB Atlas cluster hostname or URI in .env.');
  }
};
