/**
 * Todo:
 * - Handling exceptions a bit more gracefully
 * - Getting rid of the guilds.join scrope. (Not used that often and distrusted by many)
 */
"use strict";

const settings = require("../../settings.json");

if (settings.api.client.oauth2.link.slice(-1) == "/")
    settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(0, -1);

if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
    settings.api.client.oauth2.callbackpath = "/" + settings.api.client.oauth2.callbackpath;

if (settings.pterodactyl.domain.slice(-1) == "/")
    settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

const fs = require("fs");
require('ejs')

module.exports.load = async function (app) {
    app.get("/login", async (req, res) => {
        if (req.query.redirect) req.session.redirect = "/" + req.query.redirect;
        let newsettings = JSON.parse(fs.readFileSync("./settings.json"));
        res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${settings.api.client.oauth2.id}&redirect_uri=${encodeURIComponent(settings.api.client.oauth2.link + settings.api.client.oauth2.callbackpath)}&response_type=code&scope=identify%20email${newsettings.api.client.bot.joinguild.enabled == true ? "%20guilds.join" : ""}${newsettings.api.client.j4r.enabled == true ? "%20guilds" : ""}${settings.api.client.oauth2.prompt == false ? "&prompt=none" : (req.query.prompt ? (req.query.prompt == "none" ? "&prompt=none" : "") : "")}`);
    });
}