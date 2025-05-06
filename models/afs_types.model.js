const mongoose = require("mongoose");

const AfsType = mongoose.model(
  "AfsType",
  new mongoose.Schema({
    _id: Number,
    document_type: String
  })
);

module.exports = AfsType;
