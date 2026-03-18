import app from "./src/app";
import { connectdb, disconnectdb } from "./src/config/db";
import { env } from "./src/config/env";

let server;
connectdb()
    .then(() => {
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
        await disconnectdb();
        server.close(() => process.exit(0));
    })
);