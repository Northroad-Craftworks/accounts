import { Router } from 'express';
import createError from 'http-errors';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import logger from '../lib/logger.js';
import User from '../models/User.js';

const router = new Router();
export default router;

// Keep track of which strategies are configured.
const strategies = [];

// Support sessions.
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.get(id)
        .then(user => done(null, user))
        .catch(error => done(error));
});
router.use(passport.session());
router.use((req, res, next) => {
    if (!req.session) throw createError(503, "Failed to fetch session", { expose: true });
    else next();
});

// Configure the Google strategy
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (GOOGLE_CLIENT_ID) {
    const googleOptions = {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: '/oauth2/redirect/google',
        scope: ['email', 'profile'],
        store: true
    };
    passport.use(new GoogleStrategy(googleOptions, verifyOauthProfile));
    router.get('/login/google',
        (req, res, next) => {
            const state = {
                trace: req.traceId,
                destination: req.query.destination
            };
            passport.authenticate('google', { state })(req, res, next);
        });
    router.get('/oauth2/redirect/google',
        passport.authenticate('google', { failureRedirect: '/login', failureMessage: true }),
        (req, res, next) => {
            req.session.provider = 'google';
            next();
        },
        redirectToDestination);
    strategies.push('google');
}

// TODO Configure a local strategy

// Configure an anonymous strategy
if (process.env.ALLOW_ANONYMOUS === 'true') {
    router.get('/login/anonymous',
        (req, res, next) => req.login({ id: 'Anonymous', provider: 'anonymous' }, next),
        redirectToDestination);
    strategies.push('anonymous');
}


if (strategies.length) logger.verbose(`Configured authentication strategies: ${strategies.join(', ')}`);
else logger.warn('No authentication strategies are configured!');


router.get('/login/:strategy', req => {
    throw createError(404, `No ${req.params.strategy} authentication strategy is configured.`);
});

// Attach the login and logout handlers.
router.get('/login', (req, res) => {
    if (!req.session?.messages && strategies.length === 1) {
        res.redirect(`/login/${strategies[0].toLowerCase()}?trace=${req.traceId}`);
    }
    else if (strategies.length) {
        // TODO Replace placeholder login page with a proper one.
        const messages = (req.session?.messages || [])
            .map(message => `<p>${message}</p>`)
            .join('\n');
        delete req.session?.messages;

        const links = strategies
            .map(strategy => `<li><a href='/login/${strategy}'>${strategy}</a></li>`)
            .join('\n');
        res.type('html').send(`<h1>Login</h2>\n${messages}\n<ul>\n${links}\n</ul>`);
    }
    else throw createError(503, "No authentication strategies are available", { expose: true, stack: false });
});

router.use('/logout',
    (req, res, next) => {
        req.initialUser = req.user;
        req.logout(next);
    },
    (req, res) => res.redirect(`/?trace=${req.traceId}`));

// Any errors in the authentication middleware should cause the session to terminate.
router.use((error, req, res, next) => {
    req.session.destroy(_ => next(error));
});

/**
 * Helper function to redirect to the user's destination after login.
 */
function redirectToDestination(req, res) {
    // TODO Load the intended destination.
    const { authInfo, query } = req;
    if (authInfo?.state?.trace) req.setTraceId(authInfo.state.trace);
    const destination = authInfo?.destination || query?.destination || '/';
    const seperator = destination.includes('?') ? '&' : '?';
    res.redirect(`${destination}${seperator}trace=${req.traceId}`);
}

/**
 * A common function to handle all standard OAuth profiles.
 * @param {string} accessToken 
 * @param {string} refreshToken 
 * @param {object} profile 
 * @param {function} done 
 */
function verifyOauthProfile(accessToken, refreshToken, profile, done) {
    // TODO create a session for the user.
    User.oauthLogin(profile)
        .then(user => done(null, user))
        .catch(error => done(error));
};