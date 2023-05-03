require("dotenv").config();
const express = require("express");
var cors = require("cors");
const app = express();
const port = process.env.port || 3001;
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const AuthenticationHandeller = require("./controller/AuthenticationHandeller");

app.use(
  cors({
    origin: "http://localhost:3000", // use your actual domain name (or localhost), using * is not recommended
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Origin",
      "X-Requested-With",
      "Accept",
      "x-client-key",
      "x-client-token",
      "x-client-secret",
      "Authorization",
    ],
    credentials: true,
  })
);
mongoose
  .connect(process.env.dbUrl)
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(cookieParser());

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => res.send("Hello World!"));

app.use("/api/auth", AuthenticationHandeller);
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
