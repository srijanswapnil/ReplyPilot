import express from "express";
import passport from "passport";
import { env } from "../config/env.js";
import authMiddleware from "../middleware/auth.middleware.js";


const router = express.Router();

const YT_SCOPES=[
      'profile',
      'email',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
];

router
.route("/google")
.get(passport.authenticate('google', {
    scope: YT_SCOPES,
    accessType: 'offline',
    prompt: 'consent',
}));

router
.get("/google/callback")
.route(
    passport.authenticate('google',{failureRedirect:`${env.CLIENT_URL}/login?error=oauth`}),
    (req,res)=>{
        res.redirect(`${env.CLIENT_URL}/dashboard`);
    }
);

router.route("/user").get(authMiddleware,(req,res)=>{
    res.json({data:req.user});
});

router.route("/logout").post(authMiddleware,(req,res,next)=>{
    req.logout((err)=>{
        if(err)return next(err);

        req.session.destroy((err)=>{
            if(err)return next(err);

            res.clearCookie('connect.sid');
            res.json({message:'Logged Out Successfully'});
        })
    })
})

export default router;