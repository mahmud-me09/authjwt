// izW9iwQJhsBiDfmB
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken")
const app = express();
const cookieParser = require("cookie-parser")
const port = process.env.PORT || 5000;


app.use(
	cors({
		origin: ["http://localhost:5173"], 
		credentials: true,
	})
);


app.use(express.json());
app.use(cookieParser())

app.get("/", (req, res) => {
	res.send("Hello World!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.jrnlqvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

const verifyToken = async (req,res, next)=>{
	const {access_token} = req.cookies
	console.log(access_token)
	if(!access_token){
		return res.status(403).send({message: "not authorized"})
	}
	jwt.verify(access_token, process.env.SECRET, (err, decode)=>{
		if(err){
			console.log(err)
			return res.status(404).send({message:"unauthorized"})
		}
		console.log("value of the token", decode)
		req.user = decode
		next()
	});
}

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		const serviceCollection = client
			.db("car_doctor")
			.collection("services");
		const bookingCollection = client
			.db("car_doctor")
			.collection("bookings");
		
		// auth related API

		app.post('/jwt', async(req,res)=>{
			const user = req.body;
			const token = jwt.sign(user,process.env.SECRET, {expiresIn:'1hr'})
			
			res.cookie("access_token", token, {
				httpOnly:true,
				secure:process.env.NODE_ENV === "production",
				sameSite:process.env.NODE_ENV === "production" ? "none":"strict"
				
			})
			.send({success:true})
		})

		// Service related API
		app.get("/services", async (req, res) => {
			const services = await serviceCollection.find().toArray();

			res.send(services);
		});
		app.get("/services/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: id };

			const service = await serviceCollection.findOne(query);

			res.send(service);
		});

		app.post("/servicebooking", async (req, res) => {
			const booking = req.body;
			const result = await bookingCollection.insertOne(booking);

			res.send(result);
		});
		app.get("/bookings", verifyToken, async (req, res) => {
			let query = {};
			if (req.query?.email) {
				query = { email: req.query.email };
			}
			const result = await bookingCollection.find(query).toArray();
			res.send(result);
		});
		app.get("/bookings/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			let query = { _id: new ObjectId(id) };

			const result = await bookingCollection.findOne(query);
			res.send(result);
		});
		app.patch("/booking/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updatedData = { $set: req.body };
			const result = await bookingCollection.updateOne(
				filter,
				updatedData
			);
			res.send(result)
		});
		app.delete("/bookin/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const result = await bookingCollection.deleteOne(filter);
			res.send(result)
		})

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);
app.listen(port, () => {
	console.log(`Car-Doctor Server listening on port ${port}`);
});
