const mongoose = require('mongoose');

// Flexible schema (accept any fields)
const DataSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Data', DataSchema);
