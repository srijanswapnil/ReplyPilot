import { config } from "../config/env.js";
function globalErrorHandler(error, req, res, next) {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || "Internal Server Error";
    console.log(error.message);
    if (error)
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            ...(config.NODE_ENV === "development" && {
                stack: error.stack || null,
            }),
        });
    next();
}
export default globalErrorHandler;