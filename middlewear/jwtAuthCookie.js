require("dotenv").config();
const jwt = require("jsonwebtoken");

// This middleware checks the validity of the token
exports.jwtAuthCookie = (req, res, next) => {
  if (req.cookies.token) {
    const token = req.cookies.token;
    try {
      const user = jwt.verify(token, process.env.secret);
      req.user = user;
      next();
    } catch (e) {
      res.clearCookie("token");
      res.status(401).send({ rdr: "/login" });
    }
  } else {
    res.status(403).send({ rdr: "/login" });
  }
};
