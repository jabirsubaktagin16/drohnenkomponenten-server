const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ykvmt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    await client.connect();
    const toolCollection = client.db("drohnenkomponenten").collection("tools");
    const userCollection = client.db("drohnenkomponenten").collection("users");
    const orderCollection = client
      .db("drohnenkomponenten")
      .collection("orders");

    // Verify User as Admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // GET All Tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET Details from a single tool
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const toolDetails = await toolCollection.findOne(query);
      res.send(toolDetails);
    });

    // GET All Orders by email
    app.get("/order", verifyJWT, async (req, res) => {
      const customer = req.query.customer;
      const decodedEmail = req.decoded.email;
      if (customer === decodedEmail) {
        const query = { customer: customer };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // POST An Order
    app.post("/order", async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });

    // Delete an Order
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // GET All Orders
    app.get("/manageOrder", verifyJWT, verifyAdmin, async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });

    // GET All Tools in Admin Side
    app.get("/manageTools", verifyJWT, verifyAdmin, async (req, res) => {
      const tools = await toolCollection.find().toArray();
      res.send(tools);
    });

    app.post("/tools", verifyJWT, verifyAdmin, async (req, res) => {
      const tool = req.body;
      const result = await toolCollection.insertOne(tool);
      res.send(result);
    });

    app.delete("/manageTools/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await toolCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Drohnenkomponenten Server");
});

app.listen(port, () => {
  console.log(`Listening to Port ${port}`);
});
