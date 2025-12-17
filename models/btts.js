import mongoose from 'mongoose';

const { Schema } = mongoose;

const megaSchema = new Schema(
  {
    match: { type: String },
    league: { type: String },
    expl: { type: String, default: '0 stats' },
    time: { type: String },
    date: { type: String },
    bet: { type: String },
    status: { type: String, default: 'Pending' },
  },
  { strict: false, timestamps: true }
);

const yaUhakika = mongoose.connection.useDb('mikeka-ya-uhakika');
const model = yaUhakika.model('btts-tip', megaSchema);
export default model;
