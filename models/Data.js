const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
  names: String,
  age: Number,
  income: Number
});

module.exports = mongoose.model('Data', DataSchema);
