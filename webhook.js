#!/usr/bin/env node
require("dotenv").config();
const { IncomingWebhook } = require("@slack/client");
const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  port = process.env.PORT,
  exec = require("child_process").exec;

function slack(msg) {
  if (process.env.SLACK_WEBHOOK_URL == "") {
    return false;
  }

  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

  // Send simple text to the webhook channel
  webhook.send(msg, function(err, res) {
    if (err) {
      console.log("Error:", err);
    } else {
      console.log("Message sent: ", res);
    }
  });
}

function deploy() {
  exec(process.env.COMMAND, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/webhook", (req, res) => {
  res.send("GO AWAY");
});

app.post("/webhook", (req, res) => {
  let changes = {};

  try {
    changes = req.body.push.changes[0];
  } catch (e) {
    res.json(e);
  }

  if (
    changes.new.name != process.env.BRANCH ||
    req.get("User-Agent").indexOf("Bitbucket-Webhooks") < 0 ||
    req.body.repository.full_name != process.env.FULL_NAME
  ) {
    res.status(403).end();
  }

  let result = {};

  result["actor"] = req.body.actor.username;
  result["event"] = req.get("X-Event-Key");

  slack(result.actor + " - Deploy.");
  deploy();
  slack(result.actor + " - Done.");

  res.json(result);
});

app.listen(port, () => console.log("App listening on " + port));
