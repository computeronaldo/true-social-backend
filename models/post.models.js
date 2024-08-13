const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, `Post text can't be an empty string.`],
    maxLength: [500, "Post text exceeds 500 characters limit"],
  },
  postImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "postImages.files",
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
});

const Post = mongoose.model("Post", PostSchema);
module.exports = Post;
