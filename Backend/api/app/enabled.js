/*
File description: This file adds the /api api endpoint.
Usage: Send a GET request to /api including the API Key in the authorization headers. (Keep in mind to use the Bearer Token for Authorization)
Added in version: 14.0.0-ES
Author: @GHostload
*/
const check = require("../../../functions/check");

module.exports.load = async function (app, db) {
    app.get("/api", async (req, res) => {
        let settings = await check(req, res);
        if (!settings) {
            res.status(503).send({
                status: false,
                message: "The API is disabled. Please check your configuration.",
            });
            return;
        }
        res.send({
            status: true,
            message: "The API is enabled.",
        });
    });
};
