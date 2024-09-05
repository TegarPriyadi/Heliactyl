const fs = require("fs");
const fetch = require('node-fetch');
const check = require("../../../functions/check");

module.exports.load = async function (app, db) {
    app.get("/api/userinfo", async (req, res) => {
        let settings = await check(req, res, db);
        if (!settings) return;

        if (!req.query.id) return res.send({ status: "missing id" });

        if (!(await db.get("users-" + req.query.id))) return res.send({ status: "invalid id" });

        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

        if (newsettings.api.client.oauth2.link.slice(-1) == "/")
            newsettings.api.client.oauth2.link = newsettings.api.client.oauth2.link.slice(0, -1);

        if (newsettings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
            newsettings.api.client.oauth2.callbackpath = "/" + newsettings.api.client.oauth2.callbackpath;

        if (newsettings.pterodactyl.domain.slice(-1) == "/")
            newsettings.pterodactyl.domain = newsettings.pterodactyl.domain.slice(0, -1);

        let packagename = await db.get("package-" + req.query.id);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];
        if (!package) package = {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
        };
        package["name"] = packagename;

        let pterodactylid = await db.get("users-" + req.query.id);
        let userinforeq = await fetch(
            newsettings.pterodactyl.domain + "/api/application/users/" + pterodactylid + "?include=servers",
            {
                method: "get",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${newsettings.pterodactyl.key}` }
            }
        );
        if (await userinforeq.statusText == "Not Found") {
            console.log("Warning: An error occured while fetching user info from the Panel");
            console.log("- Discord ID: " + req.query.id);
            console.log("- Pterodactyl Panel ID: " + pterodactylid);
            return res.send({ status: "could not find user on panel" });
        }
        let userinfo = await userinforeq.json();

        res.send({
            status: "success",
            package: package,
            extra: await db.get("extra-" + req.query.id) ? await db.get("extra-" + req.query.id) : {
                ram: 0,
                disk: 0,
                cpu: 0,
                servers: 0
            },
            userinfo: userinfo,
            coins: newsettings.api.client.coins.enabled == true ? (await db.get("coins-" + req.query.id) ? await db.get("coins-" + req.query.id) : 0) : null
        });
    });
};