import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';

import routes from './routes/index.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  // add more dev origins if needed
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));

//db connection
mongoose.connect(process.env.MONGODB_URL).then(() => {
  console.log("Database connected successfully");
}).catch((err) => {
  console.log("Database connection failed");
  console.log(err);
});

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", async (req, res) => {
  res.status(200).json({
    message: "Welcome to the Kronis API",
  });
});
// http://localhost:500/api-v1/
app.use("/api-v1", routes);
//error middleware
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({
        message: "Internal Server Error",
    });
});

//not found middleware
app.use((req, res, next) => {
    res.status(404).json({
        message: "Resource not found",
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});