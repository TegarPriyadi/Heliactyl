const fs = require("fs");
const indexjs = require("../index.js");
const ejs = require("ejs");

async function check(req, res) {
    let settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (settings.api.client.api.enabled == true) {
        let auth = req.headers['authorization'];
        if (auth) {
            if (auth == "Bearer " + settings.api.client.api.code) {
                return settings;
            };
        };
    }
    return null;
}

module.exports = check;