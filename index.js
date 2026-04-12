require("dotenv").config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


// middleware
app.use(cors());
app.use(express.json())


const uri = process.env.MONGO_URI;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get("/", (req, res) => {
    res.send("FoodNest API Running nayeem 🚀");
});



async function run() {
    try {

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        const db = client.db('foodnest_db');

        // test route
        app.post("/foods", async (req, res) => {
            const food = req.body;
            const result = await db.collection("foods").insertOne(food);
            res.send(result);
        });

        app.get("/foods", async (req, res) => {
            const foods = await db.collection("foods").find().toArray();
            res.send(foods);
        });








    }
    finally {

    }
}
run().catch(console.dir);




app.listen(3000, () => console.log("Server running"));