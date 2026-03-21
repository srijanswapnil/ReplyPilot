
export default async function(req,res,next){
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
  return res.status(401).json({ error: 'Authentication required' });
}