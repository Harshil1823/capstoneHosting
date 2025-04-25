const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    } 
})

module.exports = mongoose.model('Comment', commentSchema);
