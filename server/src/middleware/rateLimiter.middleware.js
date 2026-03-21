import rateLimit from "express-rate-limit";

//100 req/ 15 min per user/IP
export const apilimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message:
        "Too many requests from this IP, please try again after 10 minutes",
});

export const authLimiter=rateLimit({
    windowMs:15*60*1000,
    max:10,
    message:{error:'Too many auth attempts'},
});