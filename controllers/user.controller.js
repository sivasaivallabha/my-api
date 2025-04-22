const db = require("../models");
const User = db.user;


exports.allAccess = (req, res) => {
    res.status(200).send("Public Content.");
  };
  
  exports.userBoard = (req, res) => {
    res.status(200).send("User Content.");
  };
  
  exports.adminBoard = (req, res) => {
    res.status(200).send("Admin Content.");
  };
  
  exports.moderatorBoard = (req, res) => {
    res.status(200).send("Moderator Content.");
  };

  exports.getUser = (req, res) => {
    // Get the user from the database using the userId set by the verifyToken middleware
    User.findById(req.userId)
      .then(user => {
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.status(200).send(user);
      })
      .catch(err => {
        res.status(500).send({ message: err.message });
      });
  };