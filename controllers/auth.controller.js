const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = async (req, res) => {
  try {
    // Create a new user with hashed password
    const user = new User({

      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
    });

    // Save the user to the database
    await user.save();

    // Check for roles
    if (req.body.roles) {
      // Fetch the roles from the database
      const roles = await Role.find({
        name: { $in: req.body.roles },
      });

      // Assign roles to the user
      user.roles = roles.map((role) => role._id);
      await user.save();
    } else {
      // If no roles provided, assign default 'user' role
      const role = await Role.findOne({ name: "user" });
      user.roles = [role._id];
      await user.save();
    }

    //generating a token
    const token = jwt.sign({ id: user._id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      token: token, // Include the token in the response
    });
     
    // Respond back with success message
    res.send({ message: "User was registered successfully!" });
  } catch (err) {
    // Handle errors
    res.status(500).send({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    console.log(req.body,User);
    
    // Find the user based on username
    const user = await User.findOne({ username: req.body.username });
      // .populate("roles", "-__v");  // Populate roles
    console.log(user,'User');
    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    // Check if the password is correct
    const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

    if (!passwordIsValid) {
      return res.status(401).send({ message: "Invalid Password!" });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user.id }, config.secret, {
      //algorithm: 'HS256',
      expiresIn: 86400, // 24 hours
    });

    // Get user roles
    //const authorities = user.roles.map(role => "ROLE_" + role.name.toUpperCase());

    // Store the token in the session
    //req.session.token = token;

    // Respond with user details and token
    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      //roles: authorities,
      token : token
    });
  } catch (err) {
    // Handle errors
    res.status(500).send({ message: err.message });
  }
};

exports.signout = async (req, res) => {
  try {
    // Clear the session
    req.session = null;

    // Respond with success message
    return res.status(200).send({ message: "You've been signed out!" });
  } catch (err) {
    // Handle errors
    res.status(500).send({ message: err.message });
  }
};
