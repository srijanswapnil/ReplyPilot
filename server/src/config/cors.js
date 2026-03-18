import { env } from "./env";

const WHITELIST_URL = new Set(
    (env.CORS_WHITELIST || "")
        .split(",")
        .map((whitelist_url) => whitelist_url.trim())
        .filter(Boolean)
);

const BASE_CORS = {
    credentials: true,
    allowedHeaders: [
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
    ],
    exposedHeaders: ["Authorization", "Content-Length"],
    methods: ["GET", "PUT", "PATCH", "DELETE", "POST"],
    maxAge: 86_400, //remember the max age that after which browser ask
    optionsSuccessStatus: 204,
};
function cors_option(req, cb) {
    const origin = req.header("Origin");
    if (!origin) return cb(null, { origin: true, ...BASE_CORS });
    const allowed = WHITELIST_URL.size === 0 || WHITELIST_URL.has(origin);
    cb(null, allowed ? { origin: true, ...BASE_CORS } : { origin: false });
}
export default cors_option;