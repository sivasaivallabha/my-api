//upload.js


const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Data = require('../models/Data');
const AfsType = require('../models/afs_types.model'); // Import AfsType model

// Upload and process Excel file
exports.upload = async (req, res) => {
  try {
    // console.log('Inside upload controller');

    const { filetype, ulbcode } = req.body;

    if (!filetype || !ulbcode) {
      return res.status(400).json({ message: "Both filetype and ulbcode are required." });
    }

    // Validate filetype from AfsType collection
    const documentType = await AfsType.findById(filetype);
    if (!documentType) {
      return res.status(400).json({ message: "Invalid filetype ID." });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty or invalid." });
    }

    const maxColLength = Math.max(...sheetData.map(row => row.length));

    // Normalize rows
    const normalizedData = sheetData.map(row => {
      while (row.length < maxColLength) {
        row.push('');
      }
      return row;
    });

    // Handle headers
    const headers = [];
    for (let col = 0; col < maxColLength; col++) {
      const headerCell = normalizedData[0][col];
      let hasData = false;
      for (let row = 1; row < normalizedData.length; row++) {
        if (normalizedData[row][col] && normalizedData[row][col].toString().trim() !== '') {
          hasData = true;
          break;
        }
      }
      if (!headerCell || headerCell.toString().trim() === '') {
        headers[col] = hasData ? 'null header' : null;
      } else {
        headers[col] = headerCell.toString().trim();
      }
    }

    // Build formatted data
    const formattedData = normalizedData.slice(1).map(row => {
      const rowItems = headers.map((header, idx) => {
        if (header === null) {
          return { title: null, value: null };
        } else {
          const cellValue = row[idx];
          return {
            title: header,
            value: cellValue !== undefined && cellValue !== '' ? cellValue : null
          };
        }
      });
      return { row: rowItems };
    });

    // Prepare data for MongoDB
    const parsedData = {
      filePath: filePath,
      filetype: documentType.document_type,
      ulbcode: ulbcode,
      data: formattedData,
    };

    // Check if document exists with same ulbcode and filetype
    const existingDoc = await Data.findOne({ ulbcode: ulbcode, filetype: documentType.document_type });

    if (existingDoc) {
      await Data.findOneAndUpdate(
        { ulbcode: ulbcode, filetype: documentType.document_type },
        { $set: parsedData },
        { new: true }
      );
      fs.unlinkSync(filePath); // Delete uploaded file
      return res.status(200).json({ message: "Document updated successfully." });
    } else {
      const newData = new Data(parsedData);
      await newData.save();
      fs.unlinkSync(filePath); // Delete uploaded file
      return res.status(200).json({
        message: "File uploaded and saved successfully.",
        dataCount: formattedData.length,
        filePath: filePath,
        filetype: documentType.document_type,
        ulbcode: ulbcode
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: 'Error uploading file',
      error: error.message || error.stack || error.toString()
    });
  }
};

// Fetch all saved Excel data from MongoDB
exports.getData = async (req, res) => {
  try {
    const { ulbcode, filetype } = req.query;

    const query = {}; // Start with an empty query object

    // Filter by ulbcode
    if (ulbcode) {
      query.ulbcode = ulbcode;
    }

    // If filetype is provided, fetch document type by ID and filter
    if (filetype) {
      const documentType = await AfsType.findById(filetype);
      if (!documentType) {
        return res.status(400).json({ message: "Invalid filetype ID." });
      }

      query.filetype = documentType.document_type; // Filter by actual document type
    }

    const filteredData = await Data.find(query);

    res.status(200).json(filteredData);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Error retrieving data." });
  }
};




// Helper to normalize strings
const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');

// Compute accuracy based on matching words in header
const computeAccuracy = (inputWords, targetHeader) => {
  const targetWords = normalize(targetHeader).split(' ');
  const matchedCount = inputWords.filter(word => targetWords.includes(word)).length;
  return (matchedCount / targetWords.length) * 100; // use target header length
};


// Match an input header to the fixed output headers based on accuracy
const matchHeader = (inputTitle, outputHeadersMap) => {
  if (!inputTitle) return null;
  const words = normalize(inputTitle).split(' ');

  let bestMatch = null;
  let highestAccuracy = 0;

  for (const [outputKey, variations] of Object.entries(outputHeadersMap)) {
    for (const variation of variations) {
      const accuracy = computeAccuracy(words, variation);
      if (accuracy > 80 && accuracy > highestAccuracy) {
        highestAccuracy = accuracy;
        bestMatch = outputKey;
      }
    }
  }

  return bestMatch;
};

exports.generateFormattedExcel = async (req, res) => {
  try {
    const { ulbcode, filetype } = req.query;

    if (!ulbcode || !filetype) {
      return res.status(400).json({ message: "Both ulbcode and filetype are required." });
    }

    const documentType = await AfsType.findById(filetype);
    if (!documentType) {
      return res.status(400).json({ message: "Invalid filetype ID." });
    }

    const dataDoc = await Data.findOne({ ulbcode, filetype: documentType.document_type });
    if (!dataDoc) {
      return res.status(404).json({ message: "No data found for the given ULB and filetype." });
    }

    const outputHeaders = [
      'ULB Code',
      'ULB Name',
      'Code No/Major Code',
      'Schedule No/Schedule',
      'Type of Fund',
      'Item/Head Account/Description of Items/Account Head/Description/Particulars',
      'Amount & Date (Current Year)',
      'Amount & Date (Previous Year)'
    ];

    const outputHeadersMap = {
      'ULB Name': ['ulb name'],
      'Code No/Major Code': ['code no', 'major code'],
      'Schedule No/Schedule': ['schedule no', 'schedule'],
      'Type of Fund': ['type of fund'],
      'Item/Head Account/Description of Items/Account Head/Description/Particulars': [
        'item', 'head account', 'description of items', 'account head', 'description', 'particulars'
      ],
      'Amount & Date (Current Year)': ['amount current year', 'current year amount', 'amount of current year'],
      'Amount & Date (Previous Year)': ['amount previous year', 'previous year amount', 'amount of previous year'],
    };

    const importantTitles = [
      'revenue grant',
      'contribution towards assets',
      'grant for natural calamities',
      'grants for natural calamities',
      'devolution fund',
      'devolution fund (including state finance commission fund)',
      'scheme grants',
      'grants and contribution'
    ];

    const workbook = xlsx.utils.book_new();
    const worksheetData = [outputHeaders];

    let ulbName = '';

    // Pre-fetch ULB Name
    for (const item of dataDoc.data) {
      for (const cell of item.row) {
        if (matchHeader(cell.title, { 'ULB Name': ['ulb name'] }) === 'ULB Name') {
          ulbName = cell.value || '';
          break;
        }
      }
      if (ulbName) break;
    }

    for (const item of dataDoc.data) {
      const rowObj = {
        'ULB Code': ulbcode,
        'ULB Name': ulbName,
        'Code No/Major Code': '',
        'Schedule No/Schedule': '',
        'Type of Fund': '',
        'Item/Head Account/Description of Items/Account Head/Description/Particulars': '',
        'Amount & Date (Current Year)': '',
        'Amount & Date (Previous Year)': ''
      };

      for (const cell of item.row) {
        const match = matchHeader(cell.title, outputHeadersMap);
        if (match && cell.value) {
          const labelValue = `${cell.title?.trim()}: ${cell.value}`;
          if (match === 'Item/Head Account/Description of Items/Account Head/Description/Particulars') {
            const current = rowObj[match];
            rowObj[match] = current ? `${current}, ${labelValue}` : labelValue;
          } else {
            rowObj[match] = labelValue;
          }
        }
      }

      // Only include rows if item field includes an important title
      const itemFieldLower = (rowObj['Item/Head Account/Description of Items/Account Head/Description/Particulars'] || '').toLowerCase();
      const hasImportant = importantTitles.some(title => itemFieldLower.includes(title.toLowerCase()));
      if (hasImportant) {
        worksheetData.push([
          rowObj['ULB Code'],
          rowObj['ULB Name'],
          rowObj['Code No/Major Code'],
          rowObj['Schedule No/Schedule'],
          rowObj['Type of Fund'],
          rowObj['Item/Head Account/Description of Items/Account Head/Description/Particulars'],
          rowObj['Amount & Date (Current Year)'],
          rowObj['Amount & Date (Previous Year)']
        ]);
      }
    }

    if (worksheetData.length === 1) {
      return res.status(404).json({ message: 'No relevant data found.' });
    }

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const filename = `Formatted_${ulbcode}_${Date.now()}.xlsx`;
    const downloadsDir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);
    const filepath = path.join(downloadsDir, filename);

    xlsx.writeFile(workbook, filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error downloading file.');
      }
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
