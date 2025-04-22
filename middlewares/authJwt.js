const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;

verifyToken = async (req, res, next) => {
  // Get the token from the 'Authorization' header
  const token = req.headers["authorization"] ? req.headers["authorization"].split(' ')[1] : null;
   console.log(req.headers)
  // Check if token exists
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, config.secret);
    req.userId = decoded.id; // Set user ID in the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).send({ message: "Unauthorized!" });
  }
};

isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate("roles", "-__v");
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const hasAdminRole = user.roles.some(role => role.name === "admin");
    if (!hasAdminRole) {
      return res.status(403).send({ message: "Require Admin Role!" });
    }

    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

isModerator = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate("roles", "-__v");
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const hasModRole = user.roles.some(role => role.name === "moderator");
    if (!hasModRole) {
      return res.status(403).send({ message: "Require Moderator Role!" });
    }

    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator
};

module.exports = authJwt;
