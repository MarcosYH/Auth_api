const express = require("express");
const router = express.Router();
const cookieParser = require("cookie-parser");

const usersController = require("../controllers/users")

router.use(cookieParser());
router.get("/", usersController.start)

router.post("/register", usersController.registerUser);

router.post("/login", usersController.loginUser);

router.get("/user-info", usersController.usersInfo);

router.post("/forgotpassword", usersController.forgetpassword);

router.post("/createnewpassword/:token", usersController.createnewpassword);

router.post("/auth/google", usersController.loginGoogle);

router.get("/auth/google/callback", usersController.callbackAfterloginGoogle)

module.exports = router;