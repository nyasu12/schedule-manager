import assert from 'node:assert/strict';
import { applyCapabilityOverrides, capabilityAllowed, defaultCapabilitiesForRole } from '../src/core/capabilities.js';

const manager = defaultCapabilitiesForRole('manager');
assert.equal(capabilityAllowed(manager, 'schedule.edit', 'manager'), true);
assert.equal(capabilityAllowed(manager, 'platform.settings.edit', 'manager'), false);
assert.equal(capabilityAllowed([], 'anything', 'admin'), true);
assert.deepEqual(defaultCapabilitiesForRole('time_editor'), ['schedule.start_time.edit']);

const overridden = applyCapabilityOverrides(manager, [
  { capability: 'schedule.delete', allowed: 0 },
  { capability: 'schedule.memo.edit', allowed: 1 },
  { capability: 'custom.operation', allowed: 1 },
]);
assert.equal(capabilityAllowed(overridden, 'schedule.delete'), false);
assert.equal(capabilityAllowed(overridden, 'schedule.memo.edit'), true);
assert.equal(capabilityAllowed(overridden, 'custom.operation'), true);
console.log('capability model: PASS');
