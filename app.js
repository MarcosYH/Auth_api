const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookie = require("cookie-parser");
// const auth = require("./auth");
const dotenv = require("dotenv");

const userRoutes = require("./routes/users");

// require database connection
const dbConnect = require("./db/dbConnect");

dotenv.config(); // Load environment variables from .env file

// execute database connection
dbConnect();

app.use(cookie());
// Curb Cores Error by adding a header here
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

// body parser configuration (Middleware)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.get("/", (request, response, next) => {
//   response.json({ message: "Hey! This is your server response!" });
//   next();
// });

app.use("/", userRoutes);


module.exports = app;
