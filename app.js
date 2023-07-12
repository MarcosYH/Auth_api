const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookie = require("cookie-parser");
const User = require("./db/userModel");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
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
  res.setHeader("Access-Control-Allow-Credentials", "true"); // permet l'envoi de cookies
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

app.post("/auth/google", async function (req, res, next) {
  const redirectURL = "https://auth-api-adk2.onrender.com/auth/google/callback";
  const GOOGLE_CLIENT_ID =
    "881382327006-7mbuorq3in23d3so4n6n6l1n4a4ni5ga.apps.googleusercontent.com";
  const GOOGLE_CLIENT_SECRET = "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";

  const oAuth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectURL
  );

  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile  openid ",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });

  res.json({ url: authorizeUrl });
});

app.get("/auth/google/callback", async function (req, res, next) {
  
  const code = req.query.code;

  try {
    const redirectURL = "https://auth-api-adk2.onrender.com/auth/google/callback";
  const GOOGLE_CLIENT_ID =
    "881382327006-7mbuorq3in23d3so4n6n6l1n4a4ni5ga.apps.googleusercontent.com";
  const GOOGLE_CLIENT_SECRET = "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";
    const oAuth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectURL
    );

    const { tokens } = await oAuth2Client.getToken(code);
    await oAuth2Client.setCredentials(tokens);
    console.info("Tokens acquired.");

    // j'utilise l'API Google pour obtenir les informations de l'utilisateur
    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    const { data } = await oauth2.userinfo.get();
    const {id, name, email } = data;
    // Utilisez le nom et l'email de l'utilisateur pour effectuer des opérations
    // telles que l'enregistrement dans la base de données

    const user = new User({
      name: name,
      email: email,
      googleID: id,
    });
    // save the new user
    user.save()
      // return success if the new user is added to the database successfully
      .then((result) => {
        //   create JWT token
        console.log(result, "User Created Successfully");
      })
      const token = jwt.sign(
        {
          userId: user._id,
          userEmail: user.email,
        },
        "RANDOM-TOKEN",
        { expiresIn: "24h" }
        )
        user.token=token;
        // user.token=token;
        res.cookie("TOKEN", token);
        res.cookie("EMAIL", user.email);

      // // catch error if the new user wasn't added successfully to the database
      // .catch((error) => {
      //   res.status(500).send({
      //     message: "Error creating user",
      //     error,
      //   });
      //   console.log(error, "Error creating user");
      // });
    console.log(data);
    res.redirect("http://localhost:3001/welcome");
  } catch (err) {
    console.log("Error logging in with OAuth2 user", err);
    res.redirect("http://localhost:3001/error");
  }
});

module.exports = app;
