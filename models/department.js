const { required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Company',
        required : true //every department must belong to a company
    }
});

// adding index to allow for unique departments only within a company
departmentSchema.index({ name: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
