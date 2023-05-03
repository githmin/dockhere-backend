require("dotenv").config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const user = require("../model/user");

router.post("/", async (req, res) => {
  const { username, password } = req.body;
  const userObj = await user.findOne({ username });
  if (userObj.password !== password) {
    res.sendStatus(403);
  } else {
    delete user.password;
    const token = await jwt.sign({ userObj }, process.env.secret);
    res.cookie("token", token);
    res.sendStatus(200);
  }
});
module.exports = router;
