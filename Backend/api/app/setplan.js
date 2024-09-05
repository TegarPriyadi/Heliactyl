const adminjs = require("../../admin/admin.js");
const fs = require("fs");
const check = require("../../../functions/check.js");


module.exports.load = async function (app, db) {
  app.post("/api/setplan", async (req, res) => {
    let settings = await check(req, res, db);
    if (!settings) return;

    if (!req.body) return res.send({ status: "missing body" });

    if (typeof req.body.id !== "string") return res.send({ status: "missing id" });

    if (!(await db.get("users-" + req.body.id))) return res.send({ status: "invalid id" });

    if (typeof req.body.package !== "string") {
      await db.delete("package-" + req.body.id);
      adminjs.suspend(req.body.id);
      return res.send({ status: "success" });
    } else {
      let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
      if (!newsettings.api.client.packages.list[req.body.package]) return res.send({ status: "invalid package" });
      await db.set("package-" + req.body.id, req.body.package);
      adminjs.suspend(req.body.id);
      return res.send({ status: "success" });
    }
  });
};