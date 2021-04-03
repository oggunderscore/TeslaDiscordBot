import { teslaCreds } from './credManager'
import { discordClient, connectDiscord } from './discord';
import { startPolling } from './pollerSys';


//Tesla Api
var tjs = require('teslajs');

var climateData = {
    executeCommand: false,
    hvac: null,
    temp: null
};

var myTesla = {
    authToken: null,
    vehicle: null,
    chargeState: null,
    climateState: null,
    vehicleState: null,
    driveState: null
};

var shiftState;

tjs.login(teslaCreds.email, teslaCreds.pass, function (err, result) {

    if (result.error) {
        console.log(JSON.stringify(result.error));
        process.exit(1);
    }

    connectDiscord();

    var token = JSON.stringify(result.authToken);

    if (token)
        console.log("[Tesla] Login to Tesla Account Success!");

    myTesla.authToken = result.authToken;
    startPolling();
});

export function updateDrivingStatus() {
    if (shiftState != null) {
        var direction = myTesla.driveState.heading;
        var speed = myTesla.driveState.speed;
        var state;
        if (shiftState == 'P') {
            state = 'P:';
        } else if (shiftState == 'D') {
            state = 'D:';
        } else if (shiftState == 'R') {
            state = 'R:';
        }
        discordClient.user.setPresence({ activity: { name: state + " " + speed + " mph", type: 'PLAYING' }, status: 'dnd' })
            .catch(console.error);
    }
}

var currentBat;

export function updateBatteryStatus() {
    if (myTesla.chargeState != null) {
        currentBat = myTesla.chargeState.battery_level;
        var maxBat = myTesla.chargeState.charge_limit_soc;
        discordClient.user.setPresence({ activity: { name: "🔋" + currentBat + "% / " + maxBat + "%", type: 'PLAYING' }, status: 'online' })
            .catch(console.error);
    }
}

export function updateChargingStatus() {
    if (myTesla.chargeState != null) {
        var aMin = myTesla.chargeState.minutes_to_full_charge;
        var hours = parseInt(aMin / 60, 10), minutes = aMin - (hours * 60);
        discordClient.user.setPresence({ activity: { name: "🟢 Charging: " + hours + "h " + minutes + "m left", type: 'PLAYING' }, status: 'online' })
            .catch(console.error);
    }
}

export function updateSentryStatus() {
    if (myTesla.vehicleState != null) {
        var sentryStatus = myTesla.vehicleState.sentry_mode ? "ON" : "OFF";
        discordClient.user.setPresence({ activity: { name: "🐶" + "Sentry Mode: " + sentryStatus, type: 'PLAYING' }, status: 'away' })
            .catch(console.error);
    }
}

export function updateLockedStatus() {
    if (myTesla.vehicleState != null) {
        var lockStatus = myTesla.vehicleState.locked ? "LOCKED" : "UNLOCKED";
        discordClient.user.setPresence({ activity: { name: "🔒" + "" + lockStatus, type: 'PLAYING' }, status: 'dnd' })
            .catch(console.error);
    }
}

export function updateTemperature() {
    if (myTesla.climateState != null) {
        var inTemp = c2f(myTesla.climateState.inside_temp).toFixed(2);
        var outTemp = c2f(myTesla.climateState.outside_temp).toFixed(2);
        discordClient.user.setPresence({ activity: { name: "🌡" + "In: " + inTemp + "° | Ex: " + outTemp + "°", type: 'PLAYING' }, status: 'online' })
            .catch(console.error);
    }
}

export function updateClimateStatus() { // Currently Unused
    var hvacStatus = myTesla.climateState.is_auto_conditioning_on ? "ON" : "OFF";
    discordClient.user.setPresence({ activity: { name: "🌨" + "HVAC: " + hvacStatus, type: 'PLAYING' }, status: 'online' })
        .catch(console.error);
}

var counter = 0; // D R P null

function c2f(degc) {
    return (degc * 1.8) + 32;
}

function f2c(degf) {
    return Math.round((degf - 32) * 5 / 9); // TODO: Fix bug where rounds incorrectly 74 is set to 73??? in celcius conversion.
}

export function getVehicle() {
    var options = { authToken: myTesla.authToken };
    tjs.vehicle(options, function (err, vehicle) {
        myTesla.vehicle = vehicle;

        if (vehicle != null) {
            var options = { authToken: myTesla.authToken, vehicleID: vehicle.id_s }; // Var for Vehicle ID

            tjs.chargeState(options, function (err, chargeState) {
                if (chargeState != null) {
                    myTesla.chargeState = chargeState;
                    currentBat = chargeState.battery_level;
                }
            });
            tjs.driveState(options, function (err, driveState) {
                myTesla.driveState = driveState;
                if (myTesla.driveState != null) // Randomly throws cannot read shift_state of null.
                    shiftState = myTesla.driveState.shift_state;
            });
            tjs.vehicleState(options, function (err, vehicleState) {
                myTesla.vehicleState = vehicleState;
            });
            tjs.climateState(options, function (err, climateState) {
                myTesla.climateState = climateState;
            });


            if (climateData.executeCommand == true) { // Will only execute if executeCommand is true.

                climateData.executeCommand = false; // Set to false, then follow single execution with data. 

                if (climateData.hvac == true) {
                    tjs.setTemps(options, f2c(climateData.temp), null, function (err, result) {
                        if (result.result) { // ?
                            console.log("[Tesla] Temp set to " + climateData.temp);
                        } else {
                            console.log(result.reason);
                        }
                    });
                    tjs.climateStart(options, function (err, result) {
                        if (result.result) {// ??
                            console.log("[Tesla] HVAC => On");
                        } else {
                            console.log(result);
                        }
                    });

                } else if (climateData.hvac == false) {
                    tjs.climateStop(options, function (err, result) {
                        if (result.result) {// ???
                            console.log("[Tesla] HVAC => Off");
                        } else {
                            console.log(result);
                        }
                    });
                }

            }


            if (shiftState == null) {

                //console.log("Counter: " + counter);

                if (counter >= 0 && counter < 3) {
                    tjs.chargeState(options, function (err, chargeState) {
                        myTesla.chargeState = chargeState;
                        updateBatteryStatus();
                    });
                    counter++;
                } else if (counter >= 3 && counter < 6) {
                    tjs.chargeState(options, function (err, chargeState) {
                        if (myTesla.chargeState != null) {
                            if (myTesla.chargeState.charge_rate != 0.0) {
                                updateChargingStatus();
                            } else {
                                counter = 6; // This was 2?
                            }
                        }
                    });
                    counter++;
                } else if (counter >= 6 && counter < 9) {
                    tjs.vehicleState(options, function (err, vehicleState) {
                        myTesla.vehicleState = vehicleState;
                        updateSentryStatus();
                    });
                    counter++;
                } else if (counter >= 9 && counter < 12) {
                    tjs.vehicleState(options, function (err, vehicleState) {
                        myTesla.vehicleState = vehicleState;
                        updateLockedStatus();
                    });
                    counter++;
                } else if (counter >= 12 && counter < 15) {
                    tjs.climateState(options, function (err, climateState) {
                        myTesla.climateState = climateState;
                        updateTemperature();
                    });
                    counter++;
                }
                //Reset
                if (counter == 15)
                    counter = 0;
            }

            if (shiftState != null) {
                updateDrivingStatus();
            }

        }

    });
}

export { myTesla, climateData, f2c, c2f };