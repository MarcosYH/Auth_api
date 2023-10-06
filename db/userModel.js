const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  lastname: {
    type: String,
    required: true,
  },
  firstname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please provide an Email!"],
    unique: [true, "Email Exist"],
  },
  password: {
    type: String,
    required: [false, "Not neccessary because googlelogin don't use"],
    unique: false,
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiration: {
    type: Date,
    default: null,
  },
  googleID: {
    type: String,
    default: null,
  },
  token: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema);
