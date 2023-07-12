const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: "string",
    required: true,
    unique: [true, "Name Exist"],
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
