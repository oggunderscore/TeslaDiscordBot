import { climateState } from 'teslajs';
import * as config from './config'
import { myTesla, climateData, f2c, c2f } from './tesla'
import { discordBotToken } from './credManager'

const Discord = require('discord.js');
const discordClient = new Discord.Client();

//When bot is logged in, show status.
discordClient.on('ready', () => {
    console.log(`[Discord] Logged in as ${discordClient.user.tag}!`);
});

var finalStr;

function showVehicleInfoMenu(msg) {
    msg.edit("```Name: " + myTesla.vehicle.display_name + "\nVIN: " + myTesla.vehicle.vin + "\nID: " + myTesla.vehicle.id + "\nSoftware Version: " + myTesla.vehicleState.car_version + "```");
}

function showBatteryInfoMenu() {

    msg.edit(finalStr);
}



discordClient.on('message', msg => {
    if (msg.content.startsWith('climate')) {
        var args = msg.content.split(' ');
        //console.log("Current args: " + args.length);
        if (!(args.length >= 2)) {
            msg.reply("Error: Please supply valid args! e.g. climate set 70");
        } else if (args.length >= 2) {
            var command = args[1];
            if (command == "on") {
                var prevTemp = Math.round(c2f(myTesla.climateState.driver_temp_setting)); // TODO: Fix this, why is climateStateNull?
                climateData.temp = prevTemp;
                climateData.hvac = true;
                climateData.executeCommand = true;
                msg.reply("Turning on HVAC");
            } else if (command == "off") {
                climateData.hvac = false;
                climateData.executeCommand = true;
                msg.reply("Turning off HVAC");
            } else if (command == "set") {
                if (args.length == 3) {
                    var tempToSet = args[2];
                    climateData.temp = tempToSet;
                    climateData.hvac = true;
                    climateData.executeCommand = true;
                    msg.reply("Setting temp to " + climateData.temp + " & turning HVAC on");
                } else {
                    // ERROR No temp specified
                    msg.reply("Error: Please enter a temperature! e.g. climate set 72");
                }
            } else {
                // ERROR Invalid Command
                msg.reply("Error: Please use a proper command! e.g. climate on");
            }
        }
    }
    if (msg.content === 'vehicleinfo') {
        msg.reply("```Name: " + myTesla.vehicle.display_name + "\nVIN: " + myTesla.vehicle.vin + "\nID: " + myTesla.vehicle.id + "\nSoftware Version: " + myTesla.vehicleState.car_version + "```");
    }
    if (msg.content === 'batteryinfo') {

        var chargeRate, voltage, isCharging, energyAdded;
        var batteryheater = myTesla.climateState.battery_heater ? "ON" : "OFF";
        var range = myTesla.chargeState.battery_range;
        var estRange = myTesla.chargeState.est_battery_range;
        var batteryPerc = myTesla.chargeState.battery_level;
        var chargeMax = myTesla.chargeState.charge_limit_soc;
        var portOpen = myTesla.chargeState.charge_port_door_open ? "Open" : "Closed";
        var portLatch = myTesla.chargeState.charge_port_latch;

        //What if charger isn't connected, prevent null vars

        chargeRate = myTesla.chargeState.charge_rate;
        voltage = myTesla.chargeState.charger_voltage;
        energyAdded = myTesla.chargeState.charge_energy_added;

        if (myTesla.chargeState.charger_voltage > 5) {
            isCharging = "(Charging)";
        } else {
            isCharging = "(Not Charging)";
        }

        var percStr = "SOC: " + batteryPerc + "% " + isCharging + "\n";
        var limitStr = "Charge Limit: " + chargeMax + "%\n";
        var rangeStr = "Instant Range: " + range + " mi | Estimated Range: " + estRange + " mi\n\n";
        var rateStr = "Charging Rate: " + chargeRate + " kWh | Voltage: " + voltage + "V | Energy Added: " + energyAdded + " kWh\n";
        var heaterStr = "Battery Heater: " + batteryheater + "\n";
        var portStr = "Charge Port: " + portOpen + " & " + portLatch + "\n";

        finalStr = "```\t>> Battery Information <<\n\n" + percStr + limitStr + rangeStr + rateStr + heaterStr + portStr + "```";

        msg.reply(finalStr);
    }

});

export function connectDiscord() {
    discordClient.login(discordBotToken.token);
}

export { discordClient };