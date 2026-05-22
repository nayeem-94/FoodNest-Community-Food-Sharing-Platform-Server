require("dotenv").config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;


// middleware
app.use(cors());
app.use(express.json())


const serviceAccount = require("./foodnest-6b07d-firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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


const verifyFireBaseToken = async (req, res, next) =>{
    
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }

    // verify token
    try{
        const decoded = await admin.auth().verifyIdToken(token);
        // console.log('after decode token', decoded);
        req.token_email = decoded.email;
        next();
    }
    catch{
        return res.status(401).send({message: 'unauthorized access'})
    }
    
}   

async function run() {
    try {

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        const db = client.db('foodnest_db');
        const foodRequestsCollection = db.collection("foodRequests");


        //foodreqst post api

        app.post("/foodRequests", verifyFireBaseToken, async (req, res) => {
                try 
                {
                    const request = req.body;

                    // prevent duplicate request
                    const exists = await foodRequestsCollection.findOne({
                        foodId: request.foodId,
                        userEmail: request.userEmail
                    });

                    if (exists) {
                        return res.send({ message: "Already requested" });
                    }

                    const result = await foodRequestsCollection.insertOne(request);
                    res.send(result);

                } 
                catch (error) 
                {
                    res.status(500).send({ message: "Failed to create request" });
                }
        });

        // get the requests of a user
        app.get("/food-requests/:foodId", verifyFireBaseToken, async (req, res) => {
            try {
                const foodId = req.params.foodId;

                const result = await foodRequestsCollection
                    .find({ foodId })
                    .toArray();

                res.send(result);

            } catch (error) {
                res.status(500).send({ message: "Failed to get requests" });
            }
        });

        //update request accept 
        app.patch("/accept-request/:id", verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;
                const { foodId } = req.body;

                // 1. update request
                await foodRequestsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "accepted" } }
                );

                // 2. update food
                await db.collection("foods").updateOne(
                    { _id: new ObjectId(foodId) },
                    { $set: { food_status: "donated" } }
                );

                // 3. reject other pending requests (IMPORTANT)
                await foodRequestsCollection.updateMany(
                    {
                        foodId,
                        _id: { $ne: new ObjectId(id) },
                        status: "pending"
                    },
                    { $set: { status: "rejected" } }
                );

                res.send({ message: "Request accepted" });

            } catch (error) {
                res.status(500).send({ message: "Accept failed" });
            }
        });
        
        // reject request
        app.patch("/reject-request/:id", verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;

                const result = await foodRequestsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "rejected" } }
                );

                res.send(result);

            } catch (error) {
                res.status(500).send({ message: "Reject failed" });
            }
        });

        // test route
        app.post("/foods",verifyFireBaseToken, async (req, res) => {
            const food = req.body;
            const result = await db.collection("foods").insertOne(food);
            res.send(result);
        });

        app.get("/foods",verifyFireBaseToken , async (req, res) => {
            // console.log("headers",req.headers);

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

        app.get("/my-foods",verifyFireBaseToken, async (req, res) => {

            const email = req.query.email;

            const query = { useremail: email };

           const result = await db.collection("foods").find(query).toArray();

            res.send(result);
        });

        app.get("/food/:id",verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await db.collection("foods").findOne(query);
        
                if (!result) {
                     return res.status(404).send({ message: "Food not found" });
                }
                res.send(result);
             } catch (error) {
                res.status(500).send({ message: "Error fetching food details" });
            }
        });


        app.patch("/foods/:id",verifyFireBaseToken, async (req, res) => {
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

        app.delete("/foods/:id",verifyFireBaseToken, async (req, res) => {
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