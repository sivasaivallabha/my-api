const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });
  app.get("/api/user", [authJwt.verifyToken], controller.getUser);
  app.get("/api/test/all", controller.allAccess);  // Open to everyone

  app.get("/api/test/user", [authJwt.verifyToken], controller.userBoard);  // Requires token

  app.get(
    "/api/test/mod",
    [authJwt.verifyToken, authJwt.isModerator],
    controller.moderatorBoard  // Requires token and "moderator" role
  );

  app.get(
    "/api/test/admin",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.adminBoard  // Requires token and "admin" role
  );
};
