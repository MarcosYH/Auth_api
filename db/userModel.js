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
    required: [true, "Please provide a password!"],
    unique: false,
  },
});

module.exports = mongoose.model.Users || mongoose.model("Users", UserSchema);
