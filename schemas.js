// schemas.js
const Joi = require('joi');

const taskSchema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Title is required',
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Description is required',
  }),
  dueDate: Joi.date().required().messages({
    'date.base': 'Due date must be a valid date',
    'any.required': 'Due date is required',
  }),
  importance: Joi.string()
    .valid('High Priority', 'Medium Priority', 'Low Priority')
    .required()
    .messages({
      'any.only': 'Importance must be High Priority, Medium Priority, or Low Priority',
    }),
  location: Joi.string().required().messages({
    'string.empty': 'Location is required',
  }),
  department: Joi.string().optional().messages({
    'string.empty': 'Department is required',
  }),
  newDepartment: Joi.string().optional().allow('').messages({
    'string.empty': 'New department name cannot be empty',
  }),
   // Add assignedTo as an optional string (or ObjectId in string format)
   assignedTo: Joi.string().optional().allow(''),
   imageUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Image URL must be a valid URI',
  }),
});

module.exports = { taskSchema };
