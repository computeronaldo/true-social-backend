const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const checkBio = (bio) => {
  if (bio.trim().length === 0) {
    return false;
  }
  return true;
};

const UserSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Full name is required."],
      validate: {
        validator: function (v) {
          return v.trim().length > 0;
        },
        message: "Full name cannot be empty",
      },
    },
    username: {
      type: String,
      required: [true, "Username is required."],
      validate: {
        validator: function (v) {
          return v.trim().length > 0;
        },
        message: "Username cannot be empty",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minLength: [8, "Password must be at least 8 characters long."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    websiteLink: {
      type: String,
      match: [
        /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}$/,
        "Please enter a valid website URL",
      ],
      validate: {
        validator: (url) => url !== "",
        message: "Website URL can't be empty!!",
      },
    },
    phoneNumber: {
      type: String,
      match: [/^[7-9][0-9]{9}$/, "Please fill a valid phone number"],
    },
    bio: {
      type: String,
      maxLength: [300, "Bio exceeds 300 characters length limit."],
      validate: {
        validator: checkBio,
        message: "Bio can't be an empty.",
      },
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
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    console.log("I reached here on password upadate.");
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    return next(err);
  }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
