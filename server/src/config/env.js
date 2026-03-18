import {z} from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema=z.object({
    NODE_ENV:z.enum(['development','production','test']).default('development'),
    PORT:z.string().default('5000'),
    MONGODB_URI:z.string().min(1,'MONGODB_URI is required!'),

    GOOGLE_CLIENT_ID:z.string().min(1,'GOOGLE_CLIENT_ID is required'),
    GOOGLE_CLIENT_SECRET:z.string().min(1,'GOOGLE_CLIENT_SECRET is required'),
    GOOGLE_REDIRECT_URI:z.string().min(1,'GOOGLE_REDIRECT_URI is required'),

    CORS_WHITELIST: z
    .string()
    .default("http://localhost:5173")
    .transform((val) => val.split(",").map((url) => url.trim())),

});

const parsed=envSchema.safeParse(process.env);

if(!parsed.success){
    console.error("Invalid environment variables ",parsed.error.format());
    process.exit(1);
}

export const env=parsed.data;