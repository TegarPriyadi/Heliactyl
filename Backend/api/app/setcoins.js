const check = require("../../../functions/check");


module.exports.load = async function (app, db) {
  app.post("/api/setcoins", async (req, res) => {
    let settings = await check(req, res, db);
    if (!settings) return;
    if (typeof req.body !== "object") return res.send({ status: "body must be an object" });
    if (Array.isArray(req.body)) return res.send({ status: "body cannot be an array" });
    let id = req.body.id;
    let coins = req.body.coins;
    if (typeof id !== "string") return res.send({ status: "id must be a string" });
    if (!(await db.get("users-" + id))) return res.send({ status: "invalid id" });
    if (typeof coins !== "number") return res.send({ status: "coins must be number" });
    if (coins < 0 || coins > 999999999999999) return res.send({ status: "too small or big coins" });
    if (coins == 0) {
      await db.delete("coins-" + id)
    } else {
      await db.set("coins-" + id, coins);
    }
    res.send({ status: "success" });
  });
};