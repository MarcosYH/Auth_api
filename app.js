const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");
const cookie = require("cookie-parser");
// require database connection
const dbConnect = require("./db/dbConnect");
const User = require("./db/userModel");
const auth = require("./auth");
const { google } = require("googleapis");

const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;

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

app.get("/", (request, response, next) => {
  response.json({ message: "Hey! This is your server response!" });
  next();
});

// register endpoint
app.post("/register", (request, response) => {
  // hash the password
  bcrypt
    .hash(request.body.password, 10)
    .then((hashedPassword) => {
      // create a new user instance and collect the data
      const user = new User({
        name: request.body.name,
        email: request.body.email,
        password: hashedPassword,
      });
      // save the new user
      user
        .save()
        // return success if the new user is added to the database successfully
        .then((result) => {
          response.status(201).send({
            message: "User Created Successfully",
            result,
          });
        })
        // catch error if the new user wasn't added successfully to the database
        .catch((error) => {
          response.status(500).send({
            message: "Error creating user",
            error,
          });
        });
    })
    // catch error if the password hash isn't successful
    .catch((e) => {
      response.status(500).send({
        message: "Password was not hashed successfully",
        e,
      });
    });
});

//login endpoint
app.post("/login", (request, response) => {
  // check if email exists
  User.findOne({ email: request.body.email })

    // if email exists
    .then((user) => {
      // compare the password entered and the hashed password found
      bcrypt
        .compare(request.body.password, user.password)

        // if the passwords match
        .then((passwordCheck) => {
          // check if password matches
          if (!passwordCheck) {
            return response.status(400).send({
              message: "Passwords does not match",
              error,
            });
          }
          //   create JWT token
          const token = jwt.sign(
            {
              userId: user._id,
              userEmail: user.email,
            },
            "RANDOM-TOKEN",
            { expiresIn: "24h" }
          )
          user.token=token;
          user.save();
          //   return success response
          response.status(200).send({
            message: "Login Successful",
            email: user.email,
            token,
          });
        })
        // catch error if password does not match
        .catch((error) => {
          response.status(400).send({
            message: "Passwords does not match",
            error,
          });
        });
    })
    // catch error if email does not exist
    .catch((e) => {
      response.status(404).send({
        message: "Email not found",
        e,
      });
    });
});

//user-info endpoint
app.get("/user-info", async (req, res) => {
  try {
    const email = req.query.email; // Récupère l'email de l'utilisateur connecté depuis les informations stockées dans le jeton d'authentification

    // Recherche de l'utilisateur dans la base de données par email
    const user = await User.findOne({ email: email });

    if (user) {
      // Renvoie les informations de l'utilisateur
      res.json({
        name: user.name,
        email: user.email,
      });
    } else {
      // L'utilisateur n'a pas été trouvé
      res.status(404).json({ error: "Utilisateur non trouvé" });
    }
  } catch (error) {
    // Une erreur s'est produite lors de la recherche de l'utilisateur
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche de l'utilisateur" });
  }
});

//forgotpassword endpoint
app.post("/forgotpassword", async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'utilisateur existe dans la base de données
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Générer un jeton unique
    const token = crypto.randomBytes(20).toString("hex");

    // Mettre à jour le document utilisateur avec le jeton généré et l'expiration
    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // Le jeton expirera après 1 heure (3600000 ms)
    await user.save();

    // Configurer le transporteur de messagerie pour envoyer l'e-mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "wallacecoffi@gmail.com", // Votre adresse e-mail Gmail
        pass: "tqmakiwpamlcukhk", // Votre mot de passe Gmail
      },
    });

    // Créer le contenu de l'e-mail
    const mailOptions = {
      from: "wallacecoffi@gmail.com",
      to: email,
      subject: "Réinitialisation de mot de passe",
      html: `
      <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f1f1f1;
        }
        
        .container {
            text-align: center;
            max-width: 600px;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 5px;
        }
        
        h1 {
            margin: 0;
            line-height: 24px;
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
            font-size: 20px;
            font-style: normal;
            font-weight: normal;
            color: #333333;
        }
        
        p {
            margin: 0;
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
            font-family: Helvetica, 'Helvetica Neue', Arial, verdana, sans-serif;
            line-height: 24px;
            color: #666666;
            font-size: 16px;
        }
        
        .button {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
        }
        a{
          color: #ffffff;  
      }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://sikiyi.stripocdn.email/content/guids/CABINET_dd354a98a803b60e2f0411e893c82f56/images/23891556799905703.png" alt="img" width="175">
        <h1><strong>VOUS AVEZ OUBLIÉ VOTRE MOT DE PASSE ?</strong></h1>
        <p>Hey👋!</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour modifier votre mot de passe :</p>
        <a class="button" href="https://authentification-eight.vercel.app/createnewpassword/${token}" target="_blank">RÉINITIALISER LE MOT DE PASSE</a>
    </div>
</body>
</html>
        `,
    };

    // Envoyer l'e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).json({
          error: "Une erreur s'est produite lors de l'envoi de l'e-mail",
        });
      } else {
        console.log("E-mail sent:", info.response);
        res.status(200).json({
          message: "Un e-mail de réinitialisation de mot de passe a été envoyé",
          token,
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Une erreur s'est produite lors du traitement de la demande",
    });
  }
});

// creactenewpassword endpoint
app.post("/createnewpassword/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Trouver l'utilisateur correspondant au jeton de réinitialisation
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "Jeton de réinitialisation invalide ou expiré" });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe de l'utilisateur
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error:
        "Une erreur s'est produite lors de la réinitialisation du mot de passe",
    });
  }
});

/* GET users listing. */
app.post("/auth/google", async function (req, res, next) {
  const redirectURL = "http://localhost:3000/auth/google/callback";

  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectURL
  );

  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile  openid ", "https://www.googleapis.com/auth/userinfo.email"],
    prompt: "consent",
  });

  res.json({ url: authorizeUrl });
});

// Route de rappel après l'authentification avec Google
app.get("/auth/google/callback", async function (req, res, next) {
  const code = req.query.code;

  try {
    const redirectURL = "http://localhost:3000/auth/google/callback";
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
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

// Route de rappel après l'authentification avec Google
// app.get("/auth/google/callback", async (req, res) => {

// });



// Configuration des informations d'identification OAuth 2.0
const CLIENT_ID = '881382327006-7mbuorq3in23d3so4n6n6l1n4a4ni5ga.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// Configuration de l'API Gmail
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
const gmail = google.gmail('v1');

// Route pour obtenir le jeton d'accès OAuth 2.0
// app.get('/auth/google/callback', (req, res) => {
//   const code = req.query.code;

//   // Échange du code d'autorisation avec un jeton d'accès
//   const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
//   oAuth2Client.getToken(code, (err, token) => {
//     if (err) {
//       console.error('Erreur lors de lobtention du jeton daccès :', err);
//       return res.status(500).json({ error: 'Erreur lors de lobtention du jeton daccès' });
//     }

//     // Enregistrement du jeton d'accès dans l'objet oAuth2Client pour les appels ultérieurs
//     oAuth2Client.setCredentials(token);

//     // Récupération des informations du compte Gmail
//     gmail.users.getProfile({ auth: oAuth2Client, userId: 'me' }, (err, response) => {
//       if (err) {
//         console.error('Erreur lors de la récupération des informations du compte Gmail :', err);
//         return res.status(500).json({ error: 'Erreur lors de la récupération des informations du compte Gmail' });
//       }

//       // Renvoyer les informations du compte Gmail en tant que réponse JSON
//       res.json(response.data);
//     });
//   });
// });


// Login google endpoint
app.post("/logingoogle", (req, res) => {});

// authentication endpoint
app.get("/auth-endpoint", auth, (request, response) => {
  response.json({ message: "You are authorized to access me" });
});

// free endpoint
app.get("/free-endpoint", (request, response) => {
  response.json({ message: "You are free to access me anytime" });
});

// authentication endpoint
app.get("/auth-endpoint", (request, response) => {
  response.json({ message: "You are authorized to access me" });
});

module.exports = app;
