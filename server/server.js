import app from "./src/app.js";
import { connectdb, disconnectdb } from "./src/config/db.js";
import { env } from "./src/config/env.js";

import "./src/workers/index.js";

import startSyncCronJob from "./src/jobs/syncComments.job.js";

let server;
connectdb()
    .then(() => {
        startSyncCronJob();
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
        console.info(`Caught ${sig} dranning...`);
        import("./src/workers/index.js").then(async ({ default: workers }) => {
             await Promise.all(workers.map(w => w.close()));
             console.info('BullMQ workers closed.');
        });
        await disconnectdb();
        server.close(() => process.exit(0));
    })
);