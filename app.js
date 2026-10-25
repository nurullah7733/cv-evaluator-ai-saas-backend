const express = require("express");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const app = new express();
const router = require("./src/routes/api");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { clerkMiddleware } = require("@clerk/express");

// Security Middleware bib Import
const rateLimit = require("express-rate-limit");
const sanitize = require("mongo-sanitize");
const helmet = require("helmet");
const hpp = require("hpp");
const { xss } = require("express-xss-sanitizer");
const cors = require("cors");
// Database Lib Import
const mongoose = require("mongoose");
const {
  stripeWebhookController,
} = require("./src/controllers/stripeController/stripeWebhooksController");
app.set("trust proxy", 1);

// DNS Resolver Implement
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Stripe raw body for webhook ( this must be declared before express.json() )
app.post(
  "/stripe-webhook",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhookController,
);

// Security Middleware Implement
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());

// mongoSanitize Middleware
const mongoSanitizeMiddleware = (req, res, next) => {
  req.body = sanitize(req.body || {});
  req.query = sanitize(req.query || {});
  req.params = sanitize(req.params || {});
  next();
};
app.use(mongoSanitizeMiddleware);

app.use(xss());
app.use(hpp());

// Clerk Middleware
app.use(clerkMiddleware());

// request limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

// Body Parser Implement
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Request Rate Limit
const limiter = rateLimit({ windowMs: 15 * 60 * 100, max: 3000 });
app.use(limiter);

// ******* its for cloud database *******
const URI = process.env.DATABASE_URI;
if (!URI) throw new Error("DATABASE_URI is required in backend environment.");

let OPTION = {
  user: process.env.DATABASE_USER,
  pass: process.env.DATABASE_PASS,
  autoIndex: true,
};

async function connectDB() {
  try {
    await mongoose.connect(URI, OPTION);
    console.log("✅ Database Connection Success");
  } catch (e) {
    console.error("❌ Database Connection Error:", e);
  }
}

connectDB();

// Routing Implement
app.use("/", router);

app.all("/*splat", (req, res) => {
  res.status(404).json({
    message: `The URL ${req.originalUrl} doesn't exist`,
  });
});

module.exports = app;
