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
    res.send("FoodNest API Running nayeem  yoo🚀");
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

        app.get("/featured-foods", async (req, res) => {
            const foods = await db
            .collection("foods")
            .find()
            .sort({ quantity: -1 }) // highest first
            .limit(6)               // only 6 items
            .toArray();
            res.send(foods);
        });

        app.get("/my-foods", async (req, res) => {

            const email = req.query.email;

            const query = { useremail: email };

           const result = await db.collection("foods").find(query).toArray();

            res.send(result);
        });



        app.patch("/foods/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedFood = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid ID format" });
                }       

                delete updatedFood._id;

                const query = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: updatedFood,
                };

                const result = await db.collection("foods").updateOne(query, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Food item not found" });
                }
                res.send(result);
        
            } catch (error) 
            {
                 console.error("Update Error:", error);
                res.status(500).send({ message: error.message || "Failed to update food item" });
            }
        });

        app.delete("/foods/:id", async (req, res) => {
            try {
                const id = req.params.id;
        
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid ID format" });
                }

                const query = { _id: new ObjectId(id) };
                const result = await db.collection("foods").deleteOne(query);

                if (result.deletedCount === 1) {
                    res.send(result);
                } else {
                    res.status(404).send({ message: "Food item not found" });
                }

            } catch (error) {
                console.error("Delete Error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        



    }
    finally {

    }
}
run().catch(console.dir);




app.listen(3000, () => console.log("Server running"));