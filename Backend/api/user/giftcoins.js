const NodeCache = require("node-cache");
const Queue = require("../../../Queue/Main.js");
const log = require('../../../functions/log.js')


module.exports.load = async function (app, db) {
    const queue = new Queue()
    app.get("/giftcoins", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect(`/`);

        const coins = parseInt(req.query.coins)
        if (!coins || !req.query.id) return res.redirect(`/gift?err=MISSINGFIELDS`);
        if (req.query.id.includes(`${req.session.userinfo.id}`)) return res.redirect(`/gift?err=CANNOTGIFTYOURSELF`)


        if (coins < 1) return res.redirect(`/gift?err=TOOLOWCOINS`)

        queue.addJob(async (cb) => {

            const usercoins = await db.get(`coins-${req.session.userinfo.id}`)
            const othercoins = await db.get(`coins-${req.query.id}`)
            if (!othercoins) {
                cb()
                return res.redirect(`/gift?err=USERDOESNTEXIST`)
            }
            if (usercoins < coins) {
                cb()
                return res.redirect(`/gift?err=CANTAFFORD`)
            }

            await db.set(`coins-${req.query.id}`, othercoins + coins)
            await db.set(`coins-${req.session.userinfo.id}`, usercoins - coins)

            log('gifted coins', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} sent ${coins}\ Coins to the user with the ID \`${req.query.id}\`.`)
            cb()
            return res.redirect(`/gift?success=true`);

        })
    });
};