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

export function sanitizeTravelLocationCounts(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((x) => ({
    organizationId: trimValue(x?.organizationId ?? x?.companyId, 80),
    locationId: trimValue(x?.locationId ?? x?.storeId, 80),
    arrivalCount: Math.max(0, Math.min(999, Number.parseInt(x?.arrivalCount || 0, 10) || 0)),
    departureCount: Math.max(0, Math.min(999, Number.parseInt(x?.departureCount || 0, 10) || 0)),
  })).filter((x) => x.organizationId || x.locationId || x.arrivalCount || x.departureCount);
}

export async function loadTravelFlightRows(env) {
  const result = await env.DB.prepare(`SELECT id,schedule_id,direction,sort_order,airline_code,flight_number,flight_date,origin,destination,scheduled_departure,changed_departure,scheduled_arrival,changed_arrival,terminal,gate,status,reservation_number,last_checked_at,check_source,check_url,check_note
    FROM app_flights_v2 ORDER BY schedule_id,sort_order,id`).all();
  return result.results || [];
}

export async function loadTravelLocationCountRows(env) {
  const result = await env.DB.prepare(`SELECT schedule_id,organization_id,location_id,arrival_count,departure_count
    FROM travel_schedule_location_counts_v1 ORDER BY schedule_id,organization_id,location_id`).all();
  return result.results || [];
}

function enabledPurposeSet(value) {
  if (value instanceof Set) return value;
  return new Set((value || []).filter(isTravelPurposeEnabled).map((x) => x.id));
}

export function attachTravelFlights(bySchedule, enabledPurposes, rows) {
  const travelPurposeIds = enabledPurposeSet(enabledPurposes);
  for (const row of rows || []) {
    const schedule = bySchedule.get(row.schedule_id);
    if (!schedule || !travelPurposeIds.has(schedule.purposeId)) continue;
    if (!Array.isArray(schedule.flights)) schedule.flights = [];
    if (!schedule.extensions) schedule.extensions = {};
    if (!schedule.extensions.travel) schedule.extensions.travel = {};
    if (!Array.isArray(schedule.extensions.travel.flights)) schedule.extensions.travel.flights = schedule.flights;
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

export function attachTravelLocationCounts(bySchedule, enabledPurposes, rows) {
  const travelPurposeIds = enabledPurposeSet(enabledPurposes);
  const counts = new Map();
  for (const row of rows || []) {
    if (!counts.has(row.schedule_id)) counts.set(row.schedule_id, new Map());
    counts.get(row.schedule_id).set(`${row.organization_id}|${row.location_id}`, row);
  }
  for (const schedule of bySchedule.values()) {
    if (!travelPurposeIds.has(schedule.purposeId)) continue;
    const scheduleCounts = counts.get(schedule.id) || new Map();
    for (const location of schedule.locations || schedule.stores || []) {
      const organizationId = location.organizationId ?? location.companyId ?? '';
      const locationId = location.locationId ?? location.storeId ?? '';
      const row = scheduleCounts.get(`${organizationId}|${locationId}`);
      location.arrivalCount = Number(row?.arrival_count || 0);
      location.departureCount = Number(row?.departure_count || 0);
    }
  }
}

export function appendTravelPersistenceStatements(env, statements, scheduleId, flights, locationCounts = []) {
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
  statements.push(env.DB.prepare('DELETE FROM travel_schedule_location_counts_v1 WHERE schedule_id=?').bind(scheduleId));
  for (const item of locationCounts || []) {
    statements.push(env.DB.prepare(`INSERT INTO travel_schedule_location_counts_v1(schedule_id,organization_id,location_id,arrival_count,departure_count)
      VALUES(?,?,?,?,?)`).bind(scheduleId, item.organizationId, item.locationId, item.arrivalCount, item.departureCount));
  }
}
