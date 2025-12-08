import mongoose from 'mongoose';
import cachegoose from 'recachegoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.set('strictQuery', true);
  cachegoose(mongoose, { engine: 'memory' });
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
