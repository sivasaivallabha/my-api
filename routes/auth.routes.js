const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth.controller");
const uploadController = require("../controllers/upload")
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const multerupload = multer({ storage });
module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted
    ],
    controller.signup
  );
  

  app.post("/api/upload", multerupload.single('file'),uploadController.upload);
  app.post("/api/auth/signin", controller.signin);

  app.post("/api/auth/signout", controller.signout);
};