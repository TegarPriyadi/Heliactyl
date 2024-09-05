/**
 * Todo:
 * - Restructure this entirely
 * - Improve performance and keep rate limiting in mind
 * - Find a more efficient way to manage the queue maybe using a new db?
 */
const settings = require("../../../settings.json");

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function (app, db) {

    app.get(`/api/createdServer`, async (req, res) => {
        if (!req.session.pterodactyl) return res.json({ error: true, message: `You must be logged in.` });

        const createdServer = await db.get(`createdserver-${req.session.userinfo.id}`)
        return res.json({ created: createdServer ?? false, cost: settings.renewals.cost })
    })
};
