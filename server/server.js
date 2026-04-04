import app from "./src/app.js";
import { connectdb, disconnectdb } from "./src/config/db.js";
import { env } from "./src/config/env.js";

import startSyncCronJob from "./src/jobs/syncComments.job.js";

let server;
let syncCronTask;
connectdb()
    .then(() => {
        syncCronTask = startSyncCronJob();
        app.on("error", (error) => {
            console.log("Error!!", error);
            throw error;
        });
        server = app.listen(env.PORT, () => {
            console.log(
                `Mongodb is connected successfully to port:${env.PORT}`
            );
        });
    })
    .catch((error) => {
        console.log("MONGODB failed to connect!!!", error);
        process.exit(1);
    });

["SIGTERM", "SIGINT"].forEach((sig) =>
    process.on(sig, async () => {
        console.info(`Caught ${sig}, draining...`);

        if (syncCronTask) {
            syncCronTask.stop();
            console.info("Sync cron job stopped.");
        }

        // 2. Only after workers are shut down, disconnect the database
        try {
            await disconnectdb();
            console.info("Database disconnected.");
        } catch (err) {
            console.error("Error disconnecting database:", err);
        }

        // 3. Close the HTTP server (promisified so we can await it)
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        }).catch((err) => console.error("Error closing HTTP server:", err));

        process.exit(0);
    })
);