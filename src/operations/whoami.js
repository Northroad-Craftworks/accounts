export async function whoami(req, res, next) {
    const accepts = req.accepts(['json', 'html']);
    const { user, accessToken } = req;
    if (accepts === 'html') {
        res.type(accepts);
        if (!user) res.send(`<h1>Not logged in</h1>`);
        else {
            const name = `<h1>${user.name}</h1>`;
            const email = `<p>${user.email}</p>`;
            const photo = `<img src="${user.profilePhoto}" alt="Your profile photo" crossorigin="anonymous" height=100 width=100/>`;
            res.send(`${name}\n${email}\n${photo}`);
        }
    }
    else res.json({ user, accessToken });
}