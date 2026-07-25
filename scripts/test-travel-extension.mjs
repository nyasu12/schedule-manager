import assert from 'node:assert/strict';
import { attachTravelFlights, isTravelPurposeEnabled, sanitizeTravelFlights } from '../src/extensions/travel/server.js';

assert.equal(isTravelPurposeEnabled({ enable_travel: 1 }), true);
assert.equal(isTravelPurposeEnabled({ enable_travel: 0 }), false);
assert.equal(isTravelPurposeEnabled({ enableTravel: true }), true);

const [flight] = sanitizeTravelFlights([{
  id: 'FLT_TEST',
  airlineCode: ' jl ',
  flightNumber: '123',
  flightDate: '2026-08-15',
  origin: 'hnd',
  destination: 'mnl',
  scheduledDeparture: '09:05',
  scheduledArrival: '13:10',
}]);
assert.equal(flight.airlineCode, 'JL');
assert.equal(flight.origin, 'HND');
assert.equal(flight.flightDate, '2026-08-15');
assert.throws(() => sanitizeTravelFlights([{ id: 'x', flightDate: '2026-02-30', flightNumber: '1' }]), /Travelの搭乗日/);
assert.throws(() => sanitizeTravelFlights([{ id: 'x', scheduledDeparture: '24:00', flightNumber: '1' }]), /Travelの出発時刻/);

const schedules = new Map([
  ['travel', { id: 'travel', purposeId: 'TRAVEL', flights: [] }],
  ['meeting', { id: 'meeting', purposeId: 'MEETING', flights: [] }],
]);
const purposes = [
  { id: 'TRAVEL', enable_travel: 1 },
  { id: 'MEETING', enable_travel: 0 },
];
const rows = [
  { id: 'F1', schedule_id: 'travel', flight_number: '123' },
  { id: 'F2', schedule_id: 'meeting', flight_number: '456' },
];
attachTravelFlights(schedules, purposes, rows);
assert.equal(schedules.get('travel').flights.length, 1);
assert.equal(schedules.get('meeting').flights.length, 0);

console.log('travel extension regression tests: PASS');
