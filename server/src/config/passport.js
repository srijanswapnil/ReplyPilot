import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import User from "../models/User.models.js";
import redis,{keys} from './redis.js';
import logger from "../utils/logger.js";

const YT_SCOPES = [
  'profile',
  'email',
  'https://www.googleapis.com/auth/youtube.readonly',       // read channel, videos, comments
  'https://www.googleapis.com/auth/youtube.force-ssl',      // post replies
];

passport.use(
    new GoogleStrategy(
        {
            clientID:env.GOOGLE_CLIENT_ID,
            clientSecret:env.GOOGLE_CLIENT_SECRET,
            callbackURL:env.GOOGLE_REDIRECT_URI,
            scope:YT_SCOPES,
            accessType:'offline',
            prompt:'consent'
        },
        async (accessToken,refreshToken,profile,done)=>{
            try {
                const user=await User.findOneAndUpdate(
                    {googleId:profile.id},
                    {
                        googleId:profile.id,
                        email:profile.emails[0].value,
                        displayName:profile.displayName,
                        avatar:profile.photos?.[0]?.value,
                        refreshToken
                    },
                    {upsert:true,new:true,setDefaultsOnInsert:true}
                );

                const TTL=55*60; //55 min
               

await redis.set(
  keys.ytAccessToken(user._id.toString()),
  accessToken,
  { EX: TTL }
);

await redis.set(
  keys.ytTokenExpiry(user._id.toString()),
  String(Date.now() + TTL * 1000),
  { EX: TTL }
);
                logger.info(`OAuth success for user ${user.email}`);
                return done(null,user);
            } catch (error) {
                logger.error('OAuth Strategy error:',error.message);
                return done(error,null);
            }
        }
    )
);

passport.serializeUser((user,done)=>done(null,user._id.toString()));

passport.deserializeUser(async (id,done)=>{
    try {
        const user=await User.findById(id).lean();
        done(null,user);
    } catch (error) {
        done(error,null);
    }
});

export default passport;