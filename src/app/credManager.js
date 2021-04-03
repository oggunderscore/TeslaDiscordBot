const fs = require('fs');

var teslaCreds = {};
var discordBotToken = {};

//fs.writeFileSync('creds.json', JSON.stringify(teslaCreds) + "\n" + JSON.stringify(discordBotToken));

let rawData = fs.readFileSync('creds.json', "utf-8");
let lines = rawData.split("\n");
teslaCreds = JSON.parse(lines[0]);
discordBotToken = JSON.parse(lines[1]);

export { teslaCreds, discordBotToken };