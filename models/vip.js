import mongoose from 'mongoose';
const { Schema } = mongoose;

const slipSchema = new Schema({
    match: {type: String},
    league: {type: String},
    odd: {type: Number, default: null},
    time: {type: String},
    date: {type: String},
    tip: {type: String},
    status: {type: String, default: 'pending', enum: ['pending', 'won', 'lost']},
    result: {type: String, default: '-:-'},
}, {strict: false, timestamps: true })

let mikDB = mongoose.connection.useDb('mikeka-ya-uhakika');
let vipModel = mikDB.model('vip', slipSchema);
export default vipModel;