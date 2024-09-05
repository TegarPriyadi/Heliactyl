/**
 * Todo:
 * - Some better handling of exceptions while on the Callback page?
 * - Move the Login Callback Page to a ejs file inside of the currently selected theme.
 */
"use strict";

const settings = require("../../settings.json");

if (settings.api.client.oauth2.link.slice(-1) == "/")
  settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(0, -1);

if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
  settings.api.client.oauth2.callbackpath = "/" + settings.api.client.oauth2.callbackpath;

if (settings.pterodactyl.domain.slice(-1) == "/")
  settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

module.exports.load = async function (app) {

  app.get(settings.api.client.oauth2.callbackpath, async (req, res) => {
    if (!req.query.code) return res.redirect(`/login`)
    res.send(`
    <head>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/nanobar/0.4.2/nanobar.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet">
    <title>Please wait...</title>
    </head>
    <body style="background-color: #212122; font-family: 'DM Sans', sans-serif;">
    <center>
      <br><br><br>
      <h1 style="color: white;">Logging in...</h1>
      <p style="color: white">Please wait, you'll be redirected soon</p>
    </center>
    <script type="text/javascript" defer>
      history.pushState('/login', 'Logging in...', '/login')
      window.location.replace('/submitlogin?code=${encodeURIComponent(req.query.code.replace(/'/g, ''))}')
    </script>
    </body>
    `)
  })

}
