import mongoose from 'mongoose';
import cachegoose from 'recachegoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  // 1. Configure mongoose settings first
  mongoose.set('strictQuery', true);

  // 2. Connect to database
  await mongoose.connect(uri);

  // 3. Apply caching plugin after connection
  cachegoose(mongoose, { engine: 'memory' });

  console.log('Connected to MongoDB');
}
