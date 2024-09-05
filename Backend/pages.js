/**
 * Todo:
 * - Comment and explain everything (>-<)
 * - Improve performance (maybe?)
 * - Finally Removing Arc.io? ✔
 */
const indexjs = require("../index.js");
const ejs = require("ejs");
const express = require("express");
const settings = require("../settings.json");
const fetch = require('node-fetch');

module.exports.load = async function (app, db) {
  app.all("/", async (req, res) => {

    // Check if Pterodacty session exists then check if it is saved into the db if not then redirect to the login with no prompt (so the user does not need to click on Authorize)
    if (req.session.pterodactyl) if (req.session.pterodactyl.id !== await db.get("users-" + req.session.userinfo.id)) return res.redirect("/login?prompt=none")

    // Get current theme (always returns the theme set in settings)
    let theme = indexjs.get(req);

    // Check if the current requested path is registered in the pages.json then check if either the userinfo or the pterodactyl property exist if not return to the login page 
    if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/login");

    // Check if the current request path is registered under the admin section in the pages.json
    if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {

      // Render the 'not found' page if the path is not accessible by the user.
      ejs.renderFile(
        `./Public/Themes/${theme.name}/${theme.settings.notfound}`,  // Path to the 'not found' template file.
        await indexjs.renderData(req, db, theme),  // Asynchronously fetch data to render with the template.
        null,  // Options parameter (not used here).
        async function (err, str) {  // Callback function executed after rendering the file.

          // Clean up session data to remove any new account information.
          delete req.session.newaccount;

          // Check if the user is not authenticated or session lacks 'pterodactyl' data.
          if (!req.session.userinfo || !req.session.pterodactyl) {

            // If there was an error during rendering, log the error and notify the user.
            if (err) {
              console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
              console.log(err);
              return res.send("Failed to load page. The error has been logged to the console.");
            };

            // Send the rendered 'not found' page to the client.
            return res.send(str);
          };

          // Fetch user information from the Pterodactyl API.
          let cacheaccount = await fetch(
            settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
            {
              method: "get",  // HTTP GET method for fetching data.
              headers: {
                'Content-Type': 'application/json',  // Set the content type to JSON.
                "Authorization": `Bearer ${settings.pterodactyl.key}`  // Include authorization token in the headers.
              }
            }
          );

          // Check if the user was not found on Pterodactyl.
          if (await cacheaccount.statusText == "Not Found") {

            // Log the error if there was an issue loading the route.
            if (err) {
              console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
              console.log(err);
              return res.send("Failed to load page. The error has been logged to the console.");
            };

            // Send the rendered 'not found' page to the client.
            return res.send(str);
          };

          // Parse the JSON response containing user account information.
          let cacheaccountinfo = JSON.parse(await cacheaccount.text());

          // Update the session with Pterodactyl account information.
          req.session.pterodactyl = cacheaccountinfo.attributes;

          // Check if the user is not a root admin.
          if (cacheaccountinfo.attributes.root_admin !== true) {

            // Log any error if it occurred.
            if (err) {
              console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
              console.log(err);
              return res.send("Failed to load page. The error has been logged to the console.");
            };

            // Send the rendered 'not found' page to the client.
            return res.send(str);
          };

          // Render the main index page as the user is authenticated and is a root admin.
          ejs.renderFile(
            `./Public/Themes/${theme.name}/${theme.settings.index}`,  // Path to the main index template file.
            await indexjs.renderData(req, db, theme),  // Asynchronously fetch data to render with the template.
            null,  // Options parameter (not used here).
            function (err, str) {  // Callback function executed after rendering the file.

              // Log any error if it occurred.
              if (err) {
                console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
                console.log(err);
                return res.send("Failed to load page. The error has been logged to the console.");
              };

              // Clean up session data to remove any new account information.
              delete req.session.newaccount;

              // Send the rendered index page to the client.
              res.send(str);
            }
          );
        }
      );

      return;  // End the request-response cycle for this condition.
    };

    ejs.renderFile(
      `./Public/Themes/${theme.name}/${theme.settings.index}`,  // The path to the EJS template for the main index page, dynamically constructed using theme settings.
      await indexjs.renderData(req, db, theme),  // Asynchronously fetch data to populate the template, passing the request, database, and theme.
      null,  // No additional options are provided for rendering; hence this parameter is set to null.
      function (err, str) {  // Callback function to handle the result of the rendering process.

        // Check if an error occurred during rendering.
        if (err) {
          // Log a warning message to the console with details about the route and the error.
          console.log(`Warning: An error occurred while loading route ${req._parsedUrl.pathname}:`);
          console.log(err);

          // Respond to the client with a failure message indicating an error occurred.
          return res.send("Failed to load page. The error has been logged to the console.");
        };

        // Clear the 'newaccount' property from the session if it exists.
        delete req.session.newaccount;

        // Send the rendered HTML string (str) to the client as the HTTP response.
        res.send(str);
      }
    );
  })

  // Set /assets route to the Public/Assents folder.
  app.use('/assets', express.static('./Public/Assets'));
};