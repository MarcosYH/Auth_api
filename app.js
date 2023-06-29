const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cors = require("cors");
// require database connection
const dbConnect = require("./db/dbConnect");
const User = require("./db/userModel");
const auth = require("./auth");
// execute database connection
dbConnect();

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

// body parser configuration
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
          );

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

// app.put('/creactenewpassword/:token', async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   try {
//     // Trouver l'utilisateur correspondant au jeton de réinitialisation
//     const user = await User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } });

//     if (!user) {
//       return res.status(404).json({ error: "Jeton de réinitialisation invalide ou expiré" });
//     }
//     // Hacher le nouveau mot de passe
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Mettre à jour le mot de passe de l'utilisateur
//     user.password = hashedPassword;
//     user.resetToken = undefined;
//     user.resetTokenExpiration = undefined;
//     await user.save();

//     res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Une erreur s'est produite lors de la réinitialisation du mot de passe" });
//   }
// });

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
