const check = require("../../../functions/check.js");


module.exports.load = async function (app, db) {
  app.post("/api/createcoupon", async (req, res) => {
    let settings = await check(req, res, db);
    if (!settings) return;

    if (typeof req.body !== "object") return res.send({ status: "body must be an object" });
    if (Array.isArray(req.body)) return res.send({ status: "body cannot be an array" });

    let code = typeof req.body.code == "string" ? req.body.code.slice(0, 200) : Math.random().toString(36).substring(2, 15);

    if (!code.match(/^[a-z0-9]+$/i)) return res.json({ status: "illegal characters" });

    let coins = typeof req.body.coins == "number" ? req.body.coins : 0;
    let ram = typeof req.body.ram == "number" ? req.body.ram : 0;
    let disk = typeof req.body.disk == "number" ? req.body.disk : 0;
    let cpu = typeof req.body.cpu == "number" ? req.body.cpu : 0;
    let servers = typeof req.body.servers == "number" ? req.body.servers : 0;

    if (coins < 0) return res.json({ status: "coins is less than 0" });
    if (ram < 0) return res.json({ status: "ram is less than 0" });
    if (disk < 0) return res.json({ status: "disk is less than 0" });
    if (cpu < 0) return res.json({ status: "cpu is less than 0" });
    if (servers < 0) return res.json({ status: "servers is less than 0" });

    if (!coins && !ram && !disk && !cpu && !servers) return res.json({ status: "cannot create empty coupon" });

    await db.set("coupon-" + code, {
      coins: coins,
      ram: ram,
      disk: disk,
      cpu: cpu,
      servers: servers
    });

    return res.json({ status: "success", code: code });
  });
};