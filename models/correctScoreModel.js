import mongoose from 'mongoose';
const { Schema } = mongoose;

const cscoreSchema = new Schema({
    time: {
        type: String,
    },
    siku: {
        type: String
    },
    league: {
        type: String
    },
    match: {
        type: String
    },
    tip: {
        type: String,
    },
    nano: {
        type: String,
    },
    matokeo: {
        type: String,
        default: '-:-'
    },
    jsDate: {
        type: String,
        default: 'unknown'
    },
    weekday: {
        type: String,
        default: 'unknown'
    },
    status: {
        type: String,
        default: 'pending'
    },
    prediction_url: {
        type: String,
        default: 'unknown'
    }
}, {strict: false, timestamps: true })

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo');
let correctScoreModel = mkeka_wa_leo.model('correct-score', cscoreSchema);
export default correctScoreModel;
