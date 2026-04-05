import mongoose from 'mongoose';
const { Schema } = mongoose;

const cscoreSchema = new Schema({
    time: {
        type: String,
    },
    siku: {
        type: String
    },
    league_id: {
        type: String
    },
    fixture_id: {
        type: String
    },
    match: {
        type: Object
    },
    league: {
        type: String
    },
    matokeo: {
        type: Object
    },
    venue: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: 'NS'
    }
}, {strict: false, timestamps: true })

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo')
let fixtures_resultsModel = mkeka_wa_leo.model('fixtures_result', cscoreSchema)
export default fixtures_resultsModel;