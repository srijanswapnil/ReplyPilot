import express from "express";
import youtubeRoutes from "./routes/youtube.routes.js";

const app = express();

app.use(express.json());

app.use("/auth/google", youtubeRoutes);

export default app;