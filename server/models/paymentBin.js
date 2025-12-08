import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentBinSchema = new Schema(
  {
    email: { type: String, index: true },
    phone: String,
    orderId: { type: String, unique: true, index: true },
    reference: String,
    payment_status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    meta: Object,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  { collection: 'PaymentBin' }
);

paymentBinSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const db = mongoose.connection.useDb('mikeka-ya-uhakika');
const PaymentBin = db.model('PaymentBin', paymentBinSchema);

export default PaymentBin;
