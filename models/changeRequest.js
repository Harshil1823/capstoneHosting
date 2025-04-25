const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const changeRequestSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  affectedUser: { type: String, required : true }, // Optional: the user being affected
  department: { type : String }, // Optional: affected department
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
