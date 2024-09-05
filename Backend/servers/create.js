/**
 * Todo:
 * - Restructure this entirely
 * - Improve performance and keep rate limiting in mind
 * - Find a more efficient way to manage the queue maybe using a new db?
 */
const settings = require("../../settings.json");
const fetch = require('node-fetch');
const indexjs = require("../../index.js");
const fs = require("fs");
const getPteroUser = require('../../functions/getPteroUser.js')
const Queue = require("../../Queue/Main.js")
const log = require('../../functions/log.js')

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function (app, db) {

    const queue = new Queue()
    app.get("/create", async (req, res) => {
        console.log("Received request to /create route.");
    
        if (!req.session.pterodactyl) {
            console.log("No Pterodactyl session found. Redirecting to login.");
            return res.redirect("/login");
        }
    
        let theme = indexjs.get(req);
        console.log("Theme settings loaded:", theme);
    
        let newsettings;
        try {
            newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
            console.log("Settings loaded successfully:", newsettings);
        } catch (err) {
            console.error("Error reading settings.json:", err);
            return res.send("Failed to load settings.");
        }
    
        if (!newsettings.api.client.allow.server.create) {
            console.log("Server creation is disabled in settings. Redirecting.");
            return res.redirect(theme.settings.redirect.createserverdisabled || "/");
        }
    
        queue.addJob(async (cb) => {
            console.log("Job added to the queue.");
    
            let redirectlink = theme.settings.redirect.failedcreateserver || "/";
            console.log("Redirect link set to:", redirectlink);
    
            let cacheaccount;
            try {
                cacheaccount = await getPteroUser(req.session.userinfo.id, db);
                console.log("Fetched Pterodactyl account:", cacheaccount);
    
                if (!cacheaccount) {
                    console.log("No Pterodactyl account found. Sending response.");
                    cb();
                    return res.send('Heliactyl failed to find an account on the configured panel, try relogging');
                }
    
                req.session.pterodactyl = cacheaccount.attributes;
            } catch (err) {
                console.error("Error fetching Pterodactyl user:", err);
                cb();
                return res.send("An error occurred while attempting to update your account information and server list.");
            }
    
            const { name, ram, disk, cpu, egg, location } = req.query;
            if (!(name && ram && disk && cpu && egg && location)) {
                console.log("Missing query parameters:", req.query);
                cb();
                return res.redirect(`${redirectlink}?err=MISSINGVARIABLE`);
            }
    
            try {
                decodeURIComponent(name);
            } catch (err) {
                console.error("Error decoding server name:", err);
                cb();
                return res.redirect(`${redirectlink}?err=COULDNOTDECODENAME`);
            }
    
            let packagename = await db.get("package-" + req.session.userinfo.id);
            let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];
            console.log("User package loaded:", package);
    
            let extra = await db.get("extra-" + req.session.userinfo.id) || { ram: 0, disk: 0, cpu: 0, servers: 0 };
            console.log("Extra resources loaded:", extra);
    
            let servers = req.session.pterodactyl.relationships.servers.data;
            let ram2 = 0, disk2 = 0, cpu2 = 0, servers2 = servers.length;
    
            servers.forEach(server => {
                ram2 += server.attributes.limits.memory;
                disk2 += server.attributes.limits.disk;
                cpu2 += server.attributes.limits.cpu;
            });
            console.log(`Current resources used - RAM: ${ram2}, Disk: ${disk2}, CPU: ${cpu2}, Servers: ${servers2}`);
    
            if (servers2 >= package.servers + extra.servers) {
                console.log("Too many servers. Redirecting.");
                cb();
                return res.redirect(`${redirectlink}?err=TOOMUCHSERVERS`);
            }
    
            let decodedName = decodeURIComponent(name);
            if (decodedName.length < 1) {
                console.log("Server name too short.");
                cb();
                return res.redirect(`${redirectlink}?err=LITTLESERVERNAME`);
            }
            if (decodedName.length > 191) {
                console.log("Server name too long.");
                cb();
                return res.redirect(`${redirectlink}?err=BIGSERVERNAME`);
            }
    
            if (!Object.entries(newsettings.api.client.locations).some(([key]) => key == location)) {
                console.log("Invalid location:", location);
                cb();
                return res.redirect(`${redirectlink}?err=INVALIDLOCATION`);
            }
    
            let requiredPackage = Object.entries(newsettings.api.client.locations).find(([key]) => key == location)[1].package;
            if (requiredPackage && !requiredPackage.includes(packagename ? packagename : newsettings.api.client.packages.default)) {
                console.log("User package not allowed for this location.");
                cb();
                return res.redirect(`${redirectlink}?err=PREMIUMLOCATION`);
            }
    
            if (!newsettings.api.client.eggs[egg]) {
                console.log("Invalid egg selected:", egg);
                cb();
                return res.redirect(`${redirectlink}?err=INVALIDEGG`);
            }
    
            let egginfo = newsettings.api.client.eggs[egg];
            let requestedRam = parseFloat(ram);
            let requestedDisk = parseFloat(disk);
            let requestedCpu = parseFloat(cpu);
    
            if (isNaN(requestedRam) || isNaN(requestedDisk) || isNaN(requestedCpu)) {
                console.log("Non-numeric resource allocation received. Redirecting.");
                cb();
                return res.redirect(`${redirectlink}?err=NOTANUMBER`);
            }
    
            // Resource checks (RAM, Disk, CPU)
            const checks = [
                [requestedRam + ram2 > package.ram + extra.ram, `EXCEEDRAM&num=${package.ram + extra.ram - ram2}`],
                [requestedDisk + disk2 > package.disk + extra.disk, `EXCEEDDISK&num=${package.disk + extra.disk - disk2}`],
                [requestedCpu + cpu2 > package.cpu + extra.cpu, `EXCEEDCPU&num=${package.cpu + extra.cpu - cpu2}`],
                [requestedRam < egginfo.minimum.ram, `TOOLITTLERAM&num=${egginfo.minimum.ram}`],
                [requestedDisk < egginfo.minimum.disk, `TOOLITTLEDISK&num=${egginfo.minimum.disk}`],
                [requestedCpu < egginfo.minimum.cpu, `TOOLITTLECPU&num=${egginfo.minimum.cpu}`],
                [egginfo.maximum?.ram && requestedRam > egginfo.maximum.ram, `TOOMUCHRAM&num=${egginfo.maximum.ram}`],
                [egginfo.maximum?.disk && requestedDisk > egginfo.maximum.disk, `TOOMUCHDISK&num=${egginfo.maximum.disk}`],
                [egginfo.maximum?.cpu && requestedCpu > egginfo.maximum.cpu, `TOOMUCHCPU&num=${egginfo.maximum.cpu}`]
            ];
    
            for (const [condition, error] of checks) {
                if (condition) {
                    console.log("Resource check failed:", error);
                    cb();
                    return res.redirect(`${redirectlink}?err=${error}`);
                }
            }
    
            let specs = { ...egginfo.info, user: await db.get("users-" + req.session.userinfo.id), name: decodedName };
            specs.limits = { swap: -1, memory: requestedRam, disk: requestedDisk, cpu: requestedCpu, io: 500, backups: 0 };
            specs.deploy = { locations: [location], dedicated_ip: false, port_range: [] };
    
            const createdServer = await db.get(`createdserver-${req.session.userinfo.id}`);
            const coins = await db.get("coins-" + req.session.userinfo.id) || 0;
            const cost = settings.servercreation.cost;
    
            if (createdServer && coins < cost) {
                console.log("User does not have enough coins.");
                cb();
                return res.redirect(`/servers/new?err=TOOLITTLECOINS`);
            }
    
            try {
                let serverinfo = await fetch(
                    settings.pterodactyl.domain + "/api/application/servers",
                    {
                        method: "post",
                        headers: {
                            'Content-Type': 'application/json',
                            "Authorization": `Bearer ${settings.pterodactyl.key}`,
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(specs)
                    }
                );
    
                if (serverinfo.statusText !== "Created") {
                    console.error("Failed to create server:", await serverinfo.text());
                    cb();
                    return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
                }
    
                let serverinfotext = await serverinfo.json();
                req.session.pterodactyl.relationships.servers.data.push(serverinfotext);
                console.log("Server created successfully:", serverinfotext);
    
                if (createdServer) await db.set("coins-" + req.session.userinfo.id, coins - cost);
    
                await db.set(`lastrenewal-${serverinfotext.attributes.id}`, Date.now());
                await db.set(`createdserver-${req.session.userinfo.id}`, true);
    
                console.log("Server creation completed. Redirecting to dashboard.");
                cb();
                log('created server', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} created a new server named \`${name}\` with the following specs:\n\`\`\`Memory: ${ram} MB\nCPU: ${cpu}%\nDisk: ${disk}\`\`\``);
                return res.redirect("/dashboard");
            } catch (err) {
                console.error("Error during server creation:", err);
                cb();
                return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
            }
        });
    });
    
};
