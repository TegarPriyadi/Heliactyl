const check = require("../../../functions/check.js");


module.exports.load = async function (app, db) {
  app.post("/api/revokecoupon", async (req, res) => {
    let settings = await check(req, res, db);
    if (!settings) return;

    if (typeof req.body !== "object") return res.send({ status: "body must be an object" });
    if (Array.isArray(req.body)) return res.send({ status: "body cannot be an array" });

    let code = req.body.code;

    if (!code) return res.json({ status: "missing code" });

    if (!code.match(/^[a-z0-9]+$/i)) return res.json({ status: "invalid code" });

    if (!(await db.get("coupon-" + code))) return res.json({ status: "invalid code" });

    await db.delete("coupon-" + code);

    res.json({ status: "success" })
  });
};