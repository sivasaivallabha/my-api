const AfsType = require("../models/afs_types.model");

module.exports = function(app) {
  app.get("/api/afs-types", async (req, res) => {
    try {
      const afsTypes = await AfsType.find({}, "_id document_type");
      res.status(200).json(afsTypes);
    } catch (err) {
      console.error("Error fetching AFS types:", err);
      res.status(500).json({ message: "Failed to fetch AFS types." });
    }
  });
};
