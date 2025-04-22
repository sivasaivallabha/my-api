const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Data = require('../models/Data');
const router = express.Router();
const path = require('path');
const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;
// Multer setup



exports.upload = async (req, res) => {
  try {
    console.log('inside')
    const filePath = req.file.path;

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log('sheetData', sheetData);
    // Optional validation example
    const validData = sheetData.filter(
      item => item.names && typeof item.age === 'number' && item.income
    );
    console.log('validData 1', validData);

    await Data.insertMany(validData);

    res.status(200).json({ message: 'Data uploaded and saved to MongoDB', dataCount: validData.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file', error });
  }
};


