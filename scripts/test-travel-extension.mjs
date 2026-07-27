import assert from 'node:assert/strict';
import {
  attachTravelFlights,
  attachTravelLocationCounts,
  isTravelPurposeEnabled,
  sanitizeTravelFlights,
  sanitizeTravelLocationCounts,
} from '../src/extensions/travel/server.js';

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
  checkCandidates: [{ flightNumber: 'JL125', origin: 'HND', destination: 'MNL', scheduledDeparture: '10:05', scheduledArrival: '14:10' }],
}]);
assert.equal(flight.airlineCode, 'JL');
assert.equal(flight.origin, 'HND');
assert.equal(flight.flightDate, '2026-08-15');
assert.equal(flight.checkCandidates.length, 1);
assert.equal(flight.checkCandidates[0].flightNumber, 'JL125');
assert.throws(() => sanitizeTravelFlights([{ id: 'x', flightDate: '2026-02-30', flightNumber: '1' }]), /Travelの搭乗日/);
assert.throws(() => sanitizeTravelFlights([{ id: 'x', scheduledDeparture: '24:00', flightNumber: '1' }]), /Travelの出発時刻/);

const [unknownCounts] = sanitizeTravelLocationCounts([{
  organizationId: 'ORG', locationId: 'LOC', arrivalCount: 0, departureCount: 0,
  arrivalCountKnown: false, departureCountKnown: true,
}]);
assert.equal(unknownCounts.arrivalCount, 0);
assert.equal(unknownCounts.arrivalCountKnown, false);
assert.equal(unknownCounts.departureCountKnown, true);

const schedules = new Map([
  ['travel', { id: 'travel', purposeId: 'TRAVEL', flights: [], locations: [{ organizationId: 'ORG', locationId: 'LOC' }] }],
  ['meeting', { id: 'meeting', purposeId: 'MEETING', flights: [], locations: [] }],
]);
const purposes = [
  { id: 'TRAVEL', enable_travel: 1 },
  { id: 'MEETING', enable_travel: 0 },
];
const rows = [
  { id: 'F1', schedule_id: 'travel', flight_number: '123', check_candidates_json: '[{"flightNumber":"JL125"}]' },
  { id: 'F2', schedule_id: 'meeting', flight_number: '456' },
];
attachTravelFlights(schedules, purposes, rows);
assert.equal(schedules.get('travel').flights.length, 1);
assert.equal(schedules.get('travel').flights[0].checkCandidates[0].flightNumber, 'JL125');
assert.equal(schedules.get('meeting').flights.length, 0);

attachTravelLocationCounts(schedules, purposes, [{
  schedule_id: 'travel', organization_id: 'ORG', location_id: 'LOC', arrival_count: 0, departure_count: 3,
  arrival_count_known: 0, departure_count_known: 1,
}]);
assert.equal(schedules.get('travel').locations[0].arrivalCountKnown, false);
assert.equal(schedules.get('travel').locations[0].departureCount, 3);
assert.equal(schedules.get('travel').locations[0].departureCountKnown, true);

console.log('travel extension regression tests: PASS');
