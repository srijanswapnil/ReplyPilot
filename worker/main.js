import { connectdb, disconnectdb } from "./config/db.js";
import logger from "./utils/logger.js";
import workers from "./tasks/index.js";

async function startWorker() {
    try {
        // Connect to Database
        await connectdb();
        logger.info("Worker process connected to MongoDB");

        // The workers are already initialized when imported from ./tasks/index.js
        // We just need to keep the process alive and handle shutdown
        logger.info("BullMQ Worker Service started successfully");

    } catch (error) {
        logger.error("Failed to start worker service:", error.message);
        process.exit(1);
    }
}

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down worker process...`);

    try {
        // 1. Close BullMQ workers (stop accepting new jobs)
        await Promise.all(workers.map((w) => {
            logger.info(`Closing worker: ${w.name}`);
            return w.close();
        }));
        logger.info("All BullMQ workers closed.");

        // 2. Disconnect from database
        await disconnectdb();
        logger.info("Database connection closed.");

        process.exit(0);
    } catch (error) {
        logger.error("Error during graceful shutdown:", error.message);
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start the service
startWorker();
