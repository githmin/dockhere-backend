require("dotenv").config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const user = require("../model/user");

router.post("/", async (req, res) => {
  const { username, password } = req.body;
  const userObj = await user.findOne({ username });

  if (!userObj) {
    res.sendStatus(403);
    return;
  }

  if (userObj.password !== password) {
    res.sendStatus(403);
    return;
  }

  if (!userObj.isEmailVerified) {
    res.sendStatus(403);
    return;
  }

  delete userObj.password;
  const token = await jwt.sign({ userObj }, process.env.secret);
  res.cookie("token", token, {
    sameSite: "none",
    secure: true,
  });
  res.sendStatus(200);
});

router.post("/register", async (req, res) => {
  const newUser = new user({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  });

  try {
    await newUser.save();

    // send verification email to the user
    const transporter = nodemailer.createTransport({
      host: process.env.emailHost,
      port: process.env.emailPort,
      secure: process.env.isEmailSSL, // use SSL
      auth: {
        user: process.env.emailUserName,
        pass: process.env.emailPass, // replace with your actual password
      },
    });

    const token = jwt.sign({ email: newUser.email }, process.env.secret, {
      expiresIn: "1d",
    });
    const verificationLink = `${process.env.host}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.emailUserName,
      to: newUser.email,
      subject: "Verify your email address",
      html: `Please click on the following link to verify your email address: <a href="${verificationLink}">${verificationLink}</a>`,
    };

    await transporter.sendMail(mailOptions);

    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.send({ status: 400, error: e });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const token = req.query.token;
    const decodedToken = jwt.verify(token, process.env.secret);
    const userEmail = decodedToken.email;

    const userObj = await user.findOne({ email: userEmail });
    userObj.isEmailVerified = true;
    await userObj.save();

    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.send({ status: 400, error: e });
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie("token");
  res.sendStatus(200);
});

module.exports = router;
