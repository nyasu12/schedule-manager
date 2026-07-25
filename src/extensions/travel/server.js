import { validatedDate, validatedTime } from '../../runtime-guards.js';

function trimValue(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function makeTravelId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}

export function isTravelPurposeEnabled(purpose) {
  return purpose?.enableTravel === true || Number(purpose?.enable_travel || 0) === 1;
}

export function sanitizeTravelFlights(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((x, index) => ({
    id: trimValue(x?.id, 80) || makeTravelId('FLT'),
    direction: trimValue(x?.direction, 20),
    sortOrder: index,
    airlineCode: trimValue(x?.airlineCode, 10).toUpperCase(),
    flightNumber: trimValue(x?.flightNumber, 30).toUpperCase(),
    flightDate: validatedDate(x?.flightDate, 'Travelの搭乗日'),
    origin: trimValue(x?.origin, 80).toUpperCase(),
    destination: trimValue(x?.destination, 80).toUpperCase(),
    scheduledDeparture: validatedTime(x?.scheduledDeparture, 'Travelの出発時刻'),
    changedDeparture: validatedTime(x?.changedDeparture, 'Travelの変更後出発時刻'),
    scheduledArrival: validatedTime(x?.scheduledArrival, 'Travelの到着時刻'),
    changedArrival: validatedTime(x?.changedArrival, 'Travelの変更後到着時刻'),
    terminal: trimValue(x?.terminal, 80),
    gate: trimValue(x?.gate, 80),
    status: trimValue(x?.status, 80) || '未確認',
    reservationNumber: trimValue(x?.reservationNumber, 120),
    lastCheckedAt: trimValue(x?.lastCheckedAt, 50) || null,
    checkSource: trimValue(x?.checkSource, 120),
    checkUrl: trimValue(x?.checkUrl, 1000),
    checkNote: trimValue(x?.checkNote, 1000),
  })).filter((x) => x.flightNumber || x.airlineCode || x.flightDate || x.origin || x.destination || x.reservationNumber || x.direction);
}

export async function loadTravelFlightRows(env) {
  const result = await env.DB.prepare(`SELECT id,schedule_id,direction,sort_order,airline_code,flight_number,flight_date,origin,destination,scheduled_departure,changed_departure,scheduled_arrival,changed_arrival,terminal,gate,status,reservation_number,last_checked_at,check_source,check_url,check_note
    FROM app_flights_v2 ORDER BY schedule_id,sort_order,id`).all();
  return result.results || [];
}

export function attachTravelFlights(bySchedule, purposes, rows) {
  const travelPurposeIds = new Set((purposes || []).filter(isTravelPurposeEnabled).map((x) => x.id));
  for (const row of rows || []) {
    const schedule = bySchedule.get(row.schedule_id);
    if (!schedule || !travelPurposeIds.has(schedule.purposeId)) continue;
    if (!Array.isArray(schedule.flights)) schedule.flights = [];
    schedule.flights.push({
      id: row.id,
      direction: row.direction || '',
      sortOrder: row.sort_order || 0,
      airlineCode: row.airline_code || '',
      flightNumber: row.flight_number || '',
      flightDate: row.flight_date || '',
      origin: row.origin || '',
      destination: row.destination || '',
      scheduledDeparture: row.scheduled_departure || '',
      changedDeparture: row.changed_departure || '',
      scheduledArrival: row.scheduled_arrival || '',
      changedArrival: row.changed_arrival || '',
      terminal: row.terminal || '',
      gate: row.gate || '',
      status: row.status || '未確認',
      reservationNumber: row.reservation_number || '',
      lastCheckedAt: row.last_checked_at || '',
      checkSource: row.check_source || '',
      checkUrl: row.check_url || '',
      checkNote: row.check_note || '',
    });
  }
}

export function appendTravelPersistenceStatements(env, statements, scheduleId, flights) {
  statements.push(env.DB.prepare('DELETE FROM app_flights_v2 WHERE schedule_id=?').bind(scheduleId));
  for (const flight of flights || []) {
    statements.push(env.DB.prepare(`INSERT INTO app_flights_v2(id,schedule_id,direction,sort_order,airline_code,flight_number,flight_date,origin,destination,scheduled_departure,changed_departure,scheduled_arrival,changed_arrival,terminal,gate,status,reservation_number,last_checked_at,check_source,check_url,check_note)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      flight.id, scheduleId, flight.direction, flight.sortOrder, flight.airlineCode, flight.flightNumber,
      flight.flightDate, flight.origin, flight.destination, flight.scheduledDeparture, flight.changedDeparture,
      flight.scheduledArrival, flight.changedArrival, flight.terminal, flight.gate, flight.status,
      flight.reservationNumber, flight.lastCheckedAt, flight.checkSource, flight.checkUrl, flight.checkNote,
    ));
  }
}
