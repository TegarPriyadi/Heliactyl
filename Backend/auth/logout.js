/**
 * Todo:
 * - Handling exceptions a bit nicer than currently 
 */
"use strict";

const settings = require("../../settings.json");

if (settings.api.client.oauth2.link.slice(-1) == "/")
    settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(0, -1);

if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
    settings.api.client.oauth2.callbackpath = "/" + settings.api.client.oauth2.callbackpath;

if (settings.pterodactyl.domain.slice(-1) == "/")
    settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);


const indexjs = require("../../index.js");

module.exports.load = async function (app) {
    app.get("/logout", (req, res) => {
        let theme = indexjs.get(req);
        req.session.destroy(() => {
            return res.redirect(theme.settings.redirect.logout ? theme.settings.redirect.logout : "/");
        });
    });
}