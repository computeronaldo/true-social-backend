const mongoose = require("mongoose");

const checkComment = (comment) => {
  if (comment.trim().length > 500) {
    return false;
  }
  return true;
};

const CommentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      validate: {
        validator: checkComment,
        message: "Comment can't have a length more than 500 characters",
      },
    },
    commentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", CommentSchema);
module.exports = Comment;
