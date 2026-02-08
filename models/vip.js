import mongoose from 'mongoose';
const { Schema } = mongoose;

const slipSchema = new Schema({
    date: {
        type: String,
    },
    time: {
        type: String,
    },
    league: {
        type: String,
        default: '--'
    },
    match: {
        type: String,
    },
    tip: {
        type: String,
    },
    odd: {
        type: String,
    },
    expl: {
        type: String,
    },
    result: {type: String, default: '-:-'},
    status: {type: String, default: 'pending'},
    vip_no: {type: Number, default: 3}
}, {strict: false, timestamps: true })

let mikDB = mongoose.connection.useDb('mkeka-wa-leo');
let vipModel = mikDB.model('betslip', slipSchema);
export default vipModel;