import { getVehicle, updateBatteryStatus, updateClimateStatus } from './tesla';

const Poller = require('./Poller');

let poller = new Poller(3000); //Update every 3 seconds 

export function startPolling() {

    // Wait till the timeout sent our event to the EventEmitter
    poller.onPoll(() => {
        getVehicle(); // Updates vehicle information
        poller.poll(); // Go for the next poll
    });

    // Initial start
    poller.poll();
}


//export { startPolling };