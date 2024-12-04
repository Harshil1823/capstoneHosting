const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Department', departmentSchema);
