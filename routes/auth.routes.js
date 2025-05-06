const { verifySignUp, authJwt } = require("../middlewares"); // Import the verifySignUp and authJwt middlewares
const controller = require("../controllers/auth.controller");
const uploadController = require("../controllers/upload");
const multer = require('multer');
const path = require('path');

// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const multerupload = multer({ storage });

module.exports = function(app) {
  // Set CORS headers for requests
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  // Authentication routes
  app.post("/api/auth/signup", [
    verifySignUp.checkDuplicateUsernameOrEmail,
    verifySignUp.checkRolesExisted
  ], controller.signup);

  app.post("/api/auth/signin", controller.signin);
  app.post("/api/auth/signout", controller.signout);

  // Excel file upload route (protected with JWT)
  app.post("/api/upload", [authJwt.verifyToken], multerupload.single('file'), uploadController.upload);

  // Data route (protected with JWT and optional role-based access)
  // Example 1: Only authenticated users can access
  app.get("/api/data", [authJwt.verifyToken], uploadController.getData);
  
  // Example 2: Only admins can access (if needed)
  // app.get("/api/data", [authJwt.verifyToken, authJwt.isAdmin], uploadController.getData);
  
  // Example 3: Only moderators or admins can access (if needed)
  
  // app.get("/api/data", [authJwt.verifyToken, authJwt.isModerator], uploadController.getData);
  app.get('/api/generateFormattedExcel', uploadController.generateFormattedExcel);
};
