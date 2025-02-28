const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const historySchema = new Schema({
  task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: {
    type: String,
    enum: ['Create', 'Update', 'Complete', 'Image', 'Department', 'Assign'],
    required: true
  },
  changes: [{
    field: String,
    oldValue: String,
    newValue: String,
    file: { // For image changes
      url: String,
      filename: String
    }
  }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
