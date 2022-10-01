export async function whoami(req, res, next){
    res.json({
        user: req.user,
        session: req.session,
        accessToken: req.accessToken
    })
}