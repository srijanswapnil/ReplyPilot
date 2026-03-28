import { env } from "./config/env.js";

import { ApiError } from "./utils/ApiError.js";
import globalErrorHandler from "./middleware/error.middleware.js";
import cors_option from "./config/cors.js";
import redis from "./config/redis.js";
import requestLogger from "./middleware/requestLogger.middleware.js";

import { RedisStore } from "connect-redis";
import session from "express-session";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from 'passport';
import "./config/passport.js";


const app=express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cors(cors_option));
app.use(helmet());
app.use(cookieParser());

app.use(requestLogger);

app.use(session({
  name: 'sid',
  store: new RedisStore({
    client: redis,
    prefix: 'session:',
    ttl: 60 * 60 * 24 * 7,
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

import { apilimiter, authLimiter } from "./middleware/rateLimiter.middleware.js";
app.use("/api",apilimiter);
app.use("/api/auth",authLimiter);

app.use("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        success: true,
        date: new Date().toISOString(),
        timezone: "IST",
    });
});

import authRoute from "./routes/auth.routes.js";
app.use("/api/auth", authRoute);

import viewRoutes from "./routes/view.routes.js";
app.use("/", viewRoutes);

import ChannelRoutes from "./routes/Channel.routes.js";
app.use("/api/channel",ChannelRoutes);

// import commentRoute from "./routes/comments.routes.js";
// app.use("/api/comment",commentRoute);

app.use((req, res, next) => {
    res.status(404).json(
        new ApiError(404, `Route not found for ${req.originalUrl}`)
    );
});


app.use(globalErrorHandler);

export default app;