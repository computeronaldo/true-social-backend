const mongoose = require("mongoose");

const checkPostText = (text) => {
  if (text.trim().length === 0) {
    return false;
  }
  return true;
};

const PostSchema = new mongoose.Schema(
  {
    postText: {
      type: String,
      required: [true, `Post text can't be an empty string.`],
      maxLength: [500, "Post text exceeds 500 characters limit"],
      validate: {
        validator: checkPostText,
        message: "Post text can be empty",
      },
    },
    postImage: {
      type: String,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    postCategory: {
      type: String,
      enum: [
        "General",
        "Technology",
        "Sports",
        "News",
        "Lifestyle",
        "Entertainment",
        "Health",
        "Education",
        "Travel",
        "Food",
        "Science",
        "Business",
        "Politics",
        "Art",
        "Music",
        "History",
        "Nature",
      ],
      required: [true, "Post category field can't be empty"],
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", PostSchema);
module.exports = Post;
