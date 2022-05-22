const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

//Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Running Drohnenkomponenten Server");
});

app.listen(port, () => {
  console.log(`Listening to Port ${port}`);
});
