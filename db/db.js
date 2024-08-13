const mongoose = require("mongoose");

const mongodb_URI = process.env.MONGO_URI;

const initializeDB = async () => {
  try {
    const connection = await mongoose.connect(mongodb_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    if (connection) {
      console.log("Connected to DB successfully.");
    }
  } catch (error) {
    console.log("Failed to connect to DB", error);
  }
};

// to log any errors after connection has been established with the remote DB
mongoose.connection.on("error", (err) => {
  console.log(err);
});

module.exports = initializeDB;