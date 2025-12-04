import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
