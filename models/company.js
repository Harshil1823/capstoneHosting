const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensure name is unique
        trim: true
      },
      address: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        zipCode: { type: String, required: true, trim: true }
      },
      code: {
        type: String,
        unique: true, // Ensure registration codes are unique
        required: true
      },
      storeNumber: {
        type: String,
        required: true,
        // We won't mark it globally unique because the same number might appear in different addresses,
        // but the combination of address and storeNumber will be unique.
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
});
// Create a compound index on the address fields plus storeNumber so that for one address, 
// each storeNumber is unique
companySchema.index(
  {
    'address.street': 1,
    'address.city': 1,
    'address.state': 1,
    'address.zipCode': 1,
    storeNumber: 1
  },
  { unique: true }
);

module.exports = mongoose.model('Company', companySchema);
