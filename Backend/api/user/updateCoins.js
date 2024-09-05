const fs = require("fs");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ deleteOnExpire: true, stdTTL: 59 });


module.exports.load = async function (app, db) {
    app.get("/api/updateCoins", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
        let userinfo = req.session.userinfo
        let b = await db.get(`coins-${req.session.userinfo.id}`)
        if (myCache.get(`coins_${userinfo.id}`) == true) return res.send({ coins: b });
        myCache.set(`coins_${userinfo.id}`, true, 59);
        if (await db.get(`coins-${req.session.userinfo.id}`) == null) {
            await db.set(`coins-${req.session.userinfo.id}`, 0)
        } else {
            let e = await db.get(`coins-${req.session.userinfo.id}`)
            e = e + newsettings.api.arcio["afk page"].coins
            await db.set(`coins-${req.session.userinfo.id}`, e)
        }
        let a = await db.get(`coins-${req.session.userinfo.id}`)
        res.send({ coins: a })
    })
};