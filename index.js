const express = require("express");
const multer = require("multer");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const app = express();
const cors = require("cors");

require("dotenv").config();

// models
const User = require("./models/user.models");
const Post = require("./models/post.models");
const Comment = require("./models/comment.models");

// aws configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// cors configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["https://true-social-frontend-eight.vercel.app"];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  // credentials: true,
};

// middlewares
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(cors(corsOptions));

const initializeDB = require("./db/db");

// connect to database
initializeDB();

// route handlers

// for setting new password for an existing account
app.post("/users/password", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const updatedUser = await setUserPassword(username, password);
    const userWithoutPassword = { ...updatedUser.toObject() }; // Convert mongoose document to plain object
    delete userWithoutPassword.password;

    res.status(201).json({
      message: "Password set successfully.",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get a user's profile
app.get("/profile/:profileId", async (req, res) => {
  const { profileId } = req.params;

  try {
    const profile = await fetchUserProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: "User not found!" });
    }
    res.status(200).json({
      message: "User profile fetched successfully.",
      profile: profile,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to unlike a comment
app.post("/comment/:commentId/unlike", async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body;

  try {
    const updatedComment = await unlikeComment(commentId, userId);
    res
      .status(200)
      .json({ message: "Unliked comment", comment: updatedComment });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to like a comment
app.post("/comment/:commentId/like", async (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body;

  try {
    const updatedComment = await likeComment(commentId, userId);
    res.status(200).json({ message: "Liked comment", comment: updatedComment });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to fetch all comments on a specific post
app.get("/posts/:postId/comments", async (req, res) => {
  const { postId } = req.params;

  try {
    const postComments = await fetchPostComments(postId);
    res.status(200).json({
      message: "Comments fetched successfully",
      comments: postComments,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to comment on a specific post
app.post("/posts/:postId/comment", async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;
  try {
    const postedComment = await postComment(postId, userId, text);
    res.status(200).json({
      message: "Comment posted successfully.",
      comment: postedComment,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});
// to get a specific post
app.get("/posts/:postId", async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await fetchPost(postId);
    if (!post) {
      return res.status(404).json({ error: "Post does not exist." });
    }
    res.status(200).json({ message: "Post fetched successfully.", post: post });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get user's feed
app.get("/users/:userId/feed", async (req, res) => {
  const { userId } = req.params;

  try {
    const userFeed = await getUserFeed(userId);
    if (userFeed.length === 0) {
      return res
        .status(200)
        .json({ message: "Nothing in your feed.", posts: [] });
    }
    res
      .status(200)
      .json({ message: "User feed fetched successfully.", posts: userFeed });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get user's bookmarked posts
app.get("/users/:userId/bookmarked-posts", async (req, res) => {
  const { userId } = req.params;

  try {
    const bookmarkedPosts = await getBookmarkedPosts(userId);
    if (bookmarkedPosts.length === 0) {
      return res
        .status(200)
        .json({ message: "No posts bookmarked", posts: [] });
    }
    res.status(200).json({
      message: "Bookmarked posts fetched successfully.",
      posts: bookmarkedPosts,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to bookmark a post for a specific user
app.post("/users/:userId/bookmark/:postId", async (req, res) => {
  const { userId, postId } = req.params;
  try {
    const updatedUser = await bookmarkPost(userId, postId);
    res
      .status(200)
      .json({ message: "Added to bookmarked posts.", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to unbookmark a post for a specific user
app.post("/users/:userId/unbookmark/:postId", async (req, res) => {
  const { userId, postId } = req.params;
  try {
    const updatedUser = await unbookmarkPost(userId, postId);
    res
      .status(200)
      .json({ message: "Deleted from bookmarked posts.", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get all posts
app.get("/posts", async (req, res) => {
  const pageNum = req.query.page;
  const limit = req.query.limit;

  try {
    const skip = (pageNum - 1) * limit;

    const { posts, totalPosts } = await getPostsInfo(skip, limit);

    const totalPages = Math.ceil(totalPosts / limit);

    if (totalPosts === 0) {
      return res.status(200).json({ message: "No posts found.", posts: posts });
    }
    res.status(200).json({
      posts,
      currentPage: pageNum,
      totalPages,
      totalPosts,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to unfollow a user
app.post("/users/:userId/unfollow", async (req, res) => {
  const { unfollowId } = req.body;
  const { userId } = req.params;

  try {
    const updatedUser = await unfollowUser(userId, unfollowId);
    res.status(200).json({ message: "Unfollowed", user: updatedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to follow a user
app.post("/users/:userId/follow", async (req, res) => {
  const { followId } = req.body;
  const { userId } = req.params;

  try {
    const updatedUser = await followUser(userId, followId);
    res.status(200).json({ message: "Started following", user: updatedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get follow suggestions for a specific user
app.get("/users/:userId/follow-suggestions", async (req, res) => {
  const { userId } = req.params;
  try {
    const followSuggestions = await fetchUserFollowSuggestions(userId);
    if (followSuggestions.length === 0) {
      return res.status(200).json({ message: "No users to follow." });
    }
    res.status(200).json({
      message: "Follow suggestions fetched successfully.",
      users: followSuggestions,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to like a post by a specific user
app.post("/posts/:postId/like", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  try {
    const likedPost = await likePost(postId, userId);
    res.status(200).json({ message: "Post liked", post: likedPost });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to unlike a post by a specific user
app.post("/posts/:postId/unlike", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  try {
    const unlikedPost = await unlikePost(postId, userId);
    res.status(200).json({ message: "Post unliked", post: unlikedPost });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to delete a post posted by a user
app.delete("/users/:userId/posts/:postId", async (req, res) => {
  const { userId, postId } = req.params;

  try {
    const deletedPost = await deletePost(userId, postId);

    if (!deletedPost) {
      res
        .status(403)
        .json({ error: "You're not allowed to perform this operation." });
    }
    res
      .status(201)
      .json({ message: "Post deleted successfully.", post: deletedPost });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to update a post by a specific user
app.post("/users/:userId/posts/:postId", async (req, res) => {
  const { userId, postId } = req.params;
  const { postText } = req.body;
  try {
    const modifiedPost = await updatedPost(userId, postId, postText);

    if (!modifiedPost) {
      return res
        .status(403)
        .json({ error: "You're not allowed to perform this operation." });
    }
    return res
      .status(201)
      .json({ message: "Post upadated successfully", post: modifiedPost });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to update user profile
app.post("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const updationFields = req.body;

  try {
    const updatedUser = await updateUserProfile(userId, updationFields);
    res
      .status(200)
      .json({ message: "Profile updated successfully.", user: updatedUser });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to get posts of a specific user
app.get("/users/:userId/posts", async (req, res) => {
  const { userId } = req.params;

  try {
    const posts = await getUserPosts(userId);
    if (posts.length === 0) {
      return res.status(404).json({ error: "Nothing posted yet." });
    }
    res
      .status(200)
      .json({ message: "Posts fetched successfully.", posts: posts });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to add a post posted by a specific user
app.post("/posts", upload.single("postMedia"), async (req, res) => {
  const { postedBy, postCategory, postText } = req.body;

  try {
    const newPost = new Post({ postedBy, postCategory, postText });
    await newPost.validate();

    if (!req.file) {
      const newPost = await createPost({ postedBy, postCategory, postText });
      return res
        .status(201)
        .json({ message: "Post created successfully", post: newPost });
    }

    // otherwise we need to upload the file to s3 bucket
    const params = {
      Bucket: "true-social-post-images",
      Key: `uploads/${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.error("Error uploading file:", err);
        return res
          .status(409)
          .json({ error: "Error uploading file. Please try again" });
      }

      console.log("File uploaded successfully:", data);

      const newPost = await createPost({
        postedBy,
        postText,
        postCategory,
        postImage: data.Location,
      });
      res.status(200).json({
        message: "Post created successfully",
        post: newPost,
      });
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// to check if a username is available for sign-up
app.get("/users/check-username", async (req, res) => {
  const { username } = req.query;
  try {
    const usernameAvailability = await isUsernameAvailable(username);
    if (!usernameAvailability) {
      return res.status(200).json({
        message: `${username} is available`,
        availableStatus: true,
      });
    }
    return res.status(200).json({
      message: `${username} is already taken.`,
      availableStatus: false,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// for signup
app.post("/signup", async (req, res) => {
  const newUserInfo = req.body;
  try {
    const newUser = await createNewUser(newUserInfo);

    const userWithoutPassword = { ...newUser.toObject() };
    delete userWithoutPassword.password;

    res.status(201).json({
      message: "User registered successfully.",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

// for login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await findUser(username);
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    if (!user.password) {
      return res
        .status(403)
        .json({ error: "Please set a password for your account!!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const userWithoutPassword = { ...user.toObject() }; // Convert mongoose document to plain object
    delete userWithoutPassword.password;

    res.status(200).json({
      message: "User logged in successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      let inputValidationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        inputValidationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({ error: inputValidationErrors });
    }
    res.status(500).json({ error: "Server error. Something went wrong." });
  }
});

const setUserPassword = async (username, password) => {
  try {
    const user = await findUser(username);
    user.password = password;

    await user.save();
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const fetchUserProfile = async (profileId) => {
  try {
    const profile = await User.findById(profileId);
    return profile;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const likeComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $addToSet: { likedBy: userId },
      },
      { new: true }
    ).populate("commentBy postId");
    return comment;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const unlikeComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $pull: { likedBy: userId },
      },
      { new: true }
    ).populate("commentBy postId");
    return comment;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const fetchPostComments = async (postId) => {
  try {
    const comments = await Comment.find({ postId })
      .populate("commentBy postId")
      .sort({ createdAt: -1 });
    return comments;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const postComment = async (postId, userId, text) => {
  const comment = new Comment({ postId, commentBy: userId, text });

  try {
    const postedComment = await comment.save();
    return postedComment;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const fetchPost = async (postId) => {
  try {
    const post = await Post.findById(postId).populate({
      path: "postedBy",
      select: "username fullname",
    });
    return post;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getUserFeed = async (userId) => {
  try {
    const user = await User.findById(userId);

    const followersId = user.followers;
    const followingId = user.following;

    const userIds = [...followersId, ...followingId];

    const userFeed = await Post.find({ postedBy: { $in: userIds } }).populate({
      path: "postedBy",
      select: "username fullname",
    });
    return userFeed;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getBookmarkedPosts = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: "bookmarkedPosts",
        populate: {
          path: "postedBy",
          select: "username fullname",
        },
      })
      .select("bookmarkedPosts")
      .exec();

    const posts = user ? user.bookmarkedPosts : [];
    return posts;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const unbookmarkPost = async (userId, postId) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { bookmarkedPosts: postId } },
      { new: true }
    );
    return updatedUser;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const bookmarkPost = async (userId, postId) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { bookmarkedPosts: postId } },
      { new: true }
    );
    return updatedUser;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getPostsInfo = async (skip, limit) => {
  try {
    const posts = await Post.find()
      .skip(skip)
      .limit(limit)
      .populate("postedBy")
      .sort({ createdAt: -1 })
      .exec();
    const totalPosts = await Post.countDocuments();
    return { posts, totalPosts };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const unfollowUser = async (userId, unfollowId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { following: unfollowId },
      },
      { new: true, session }
    );

    await User.findByIdAndUpdate(
      unfollowId,
      { $pull: { followers: userId } },
      { new: true, session }
    );
    await session.commitTransaction();
    return updatedUser;
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    throw error;
  } finally {
    session.endSession();
  }
};

const followUser = async (userId, followId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { following: followId } },
      { new: true, session }
    );

    await User.findByIdAndUpdate(
      followId,
      { $addToSet: { followers: userId } },
      { session }
    );

    await session.commitTransaction();
    return updatedUser;
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    throw error;
  } finally {
    session.endSession();
  }
};

const fetchUserFollowSuggestions = async (userId) => {
  try {
    const user = await User.findById(userId).populate("following");
    const followingUserIds = user.following.map((user) => user._id);

    const topUsers = await User.find({
      _id: { $nin: [...followingUserIds, userId] },
    })
      .sort({ followers: -1 })
      .limit(5)
      .select("username fullname avatar");
    return topUsers;
  } catch (error) {
    throw error;
  }
};

const likePost = async (postId, userId) => {
  try {
    const likedPost = await Post.findByIdAndUpdate(
      postId,
      { $addToSet: { likedBy: userId } },
      { new: true, runValidators: true }
    ).populate("postedBy");
    return likedPost;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const unlikePost = async (postId, userId) => {
  try {
    const unlikedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likedBy: userId } },
      { new: true, runValidators: true }
    ).populate("postedBy");
    return unlikedPost;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const deletePost = async (userId, postId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deletedPost = await Post.findOneAndDelete({
      _id: postId,
      postedBy: userId,
    });

    if (!deletedPost) {
      return null;
    }

    await User.updateMany(
      { bookmarkedPosts: postId },
      { $pull: { bookmarkedPosts: postId } },
      { session }
    );

    await session.commitTransaction();
    return deletedPost;
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction failed, rolled back changes: ", error);
    throw error;
  } finally {
    session.endSession();
  }
};

const updatedPost = async (userId, postId, postText) => {
  try {
    const modifiedPost = await Post.findOneAndUpdate(
      { _id: postId, postedBy: userId },
      { postText },
      { new: true, runValidators: true }
    );

    if (!modifiedPost) {
      return null;
    }

    return modifiedPost;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getUserPosts = async (userId) => {
  try {
    const posts = await Post.find({ postedBy: userId })
      .populate("postedBy")
      .sort({ createdAt: -1 });
    return posts;
  } catch (error) {
    throw error;
  }
};

const updateUserProfile = async (userId, updationFields) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updationFields, {
      new: true,
      runValidators: true,
    });
    return updatedUser;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createPost = async (postInfo) => {
  const postData = new Post(postInfo);
  try {
    const newPost = await postData.save();
    return newPost;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const isUsernameAvailable = async (username) => {
  try {
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  }
};

const createNewUser = async (userInfo) => {
  const newUser = new User(userInfo);
  try {
    const createdUser = await newUser.save();
    return createdUser;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const findUser = async (username) => {
  try {
    const user = await User.findOne({ username: username });
    return user;
  } catch (error) {
    throw error;
  }
};

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
