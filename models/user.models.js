const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    phoneNumber: {
      type: String,
      match: [/^[7-9][0-9]{9}$/, "Please fill a valid phone number"],
      required: [true, "Phone number is required"],
    },
    bio: {
      type: String,
      maxLength: [250, "Bio exceeds 250 characters length limit."],
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bookmarkedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    avatar: {
      type: String,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
