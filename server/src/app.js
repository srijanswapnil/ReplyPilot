import { env } from "./config/env.js";

import { ApiError } from "./utils/ApiError.js";
import globalErrorHandler from "./middleware/error.middleware.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

const app=express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cors(env.CORS_WHITELIST));
app.use(helmet());
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message:
        "Too many requests from this IP, please try again after 10 minutes",
});

app.use("/api",limiter);

app.use("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        success: true,
        date: new Date.toISOString(),
        timezone: "IST",
    });
});

import authRoute from "./routes/auth.routes.js";
app.use("/api/auth/google", authRoute);

import youtubeRoute from "./routes/youtube.routes.js";
app.use("/api/youtube",youtubeRoute);

import commentRoute from "./routes/comments.routes.js";
app.use("/api/comment",commentRoute);

app.use((req, res, next) => {
    res.status(400).json(
        new ApiError(400, `Route not found for ${req.originalUrl}`)
    );
});


app.use(globalErrorHandler);

export default app;