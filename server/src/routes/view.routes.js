import express from "express";

const router = express.Router();

// 🔐 LOGIN PAGE
router.get("/login", (req, res) => {
    const error = req.query.error;

    res.send(`
        <h2>Login Page</h2>
        ${error ? `<p style="color:red;">Login failed. Please try again.</p>` : ""}
        
        <a href="/api/auth/google">
            <button style="padding:10px 20px;cursor:pointer;">
                Login with Google
            </button>
        </a>
    `);
});

// 📊 DASHBOARD PAGE
router.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.send(`
            <h2>You are not logged in</h2>
            <a href="/api/auth/google">
                <button style="padding:10px 20px;cursor:pointer;">
                    Login with Google
                </button>
            </a>
        `);
    }

    res.send(`
        <h2>Hi ${req.user.displayName}, welcome to dashboard</h2>
        <form action="/api/auth/logout" method="POST">
            <button type="submit" style="padding:10px 20px;cursor:pointer;">
                Logout
            </button>
        </form>
    `);
});

router.get("/", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.send(`
            <h2>You are not logged in</h2>
            <a href="/api/auth/google">
                <button style="padding:10px 20px;cursor:pointer;">
                    Login with Google
                </button>
            </a>
        `);
    }

    res.send(`
        <h2>Hi ${req.user.displayName}, welcome to dashboard</h2>
        <form action="/api/auth/logout" method="POST">
            <button type="submit" style="padding:10px 20px;cursor:pointer;">
                Logout
            </button>
        </form>
    `);
});

export default router;