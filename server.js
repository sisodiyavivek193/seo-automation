require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const reportRoutes = require("./routes/reportRoutes");

console.log("⏰ Loading Cron Scheduler...");
require("./cron/reportScheduler");

const app = express();

// ✅ FIX 1: Proper CORS config - POST requests allow karta hai
app.use(cors({
    origin: "*", // Production mein apna frontend URL daalo e.g. "http://localhost:3000"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ FIX 2: Body size limit increase - bade payloads ke liye
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

console.log("🔌 Connecting MongoDB...");
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
    res.send("SEO Automation Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


// require("dotenv").config(); // FIRST

// const express = require("express");
// const cors = require("cors");

// const connectDB = require("./config/db");

// const clientRoutes = require("./routes/clientRoutes");
// const reportRoutes = require("./routes/reportRoutes");

// console.log("⏰ Loading Cron Scheduler...");
// require("./cron/reportScheduler");

// const app = express();

// app.use(cors());
// app.use(express.json());

// console.log("🔌 Connecting MongoDB...");
// connectDB();

// app.use("/api/clients", clientRoutes);
// app.use("/api/reports", reportRoutes);

// app.get("/", (req, res) => {
//     console.log("Root API hit");
//     res.send("SEO Automation Backend Running 🚀");
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });

