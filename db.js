const mongoose = require("mongoose");

require("dotenv").config();

const MONGODB_URL = process.env.MONGODB_URL;
const dbName = process.env.DB;

mongoose
  .connect(MONGODB_URL, {
    dbName: dbName,
  })
  .then(() => {
    console.log("Database connection success");
  })
  .catch((err) => {
    console.log("Database connection error" + err);
  });
