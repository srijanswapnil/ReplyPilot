import mongoose from "mongoose";
import { env } from "./env";

const MONGO_OPTIONS={
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2
};

let isConnected = false;
async function connectdb() {
    if (isConnected) return;
    try {
        await mongoose.connect(env.MONGODB_URI, MONGO_OPTIONS);
        isConnected = true;
        console.log(`✅  Mongoose connected → ${mongoose.connection.name}`);
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}
async function disconnectdb() {
    if (!isConnected) return;
    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log("Mongoose disconnected successfully!");
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.info('MongoDB reconnected');
});
export { connectdb, disconnectdb };