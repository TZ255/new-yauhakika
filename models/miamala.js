import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const MiamalaSchema = new Schema({
    txid: { type: String },
    phone: { type: String },
    name: { type: String },
    amt: { type: Number },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '30m' }
    }
}, { strict: false, timestamps: false });

const ohymy = mongoose.connection.useDb('ohmyNew');
const miamalaModel = ohymy.model('Miamala', MiamalaSchema);
export default miamalaModel;