/**
 * Todo:
 * - Restructure this entirely
 * - Improve performance and keep rate limiting in mind
 * - Find a more efficient way to manage the queue maybe using a new db?
 */
const settings = require("../../settings.json");
const fetch = require('node-fetch');
const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const fs = require("fs");

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
  if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function (app, db) {

  app.get("/delete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("An error has occur while attempting to delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect('/dashboard');
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });

  app.get("/forcedelete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/force",
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("An error has occur while attempting to delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      await db.delete(`lastrenewal-${req.query.id}`)

      adminjs.suspend(req.session.userinfo.id);

      return res.redirect('/dashboard');
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled ? theme.settings.redirect.deleteserverdisabled : "/");
    }
  });
};
