import test from 'node:test';
import assert from 'node:assert/strict';
import { EnquiryLab, NotificationLab } from '../src/models.mjs';

const event = (overrides = {}) => ({ source: 'website', ref: 'TEST-001', email: 'sam@example.test', service: 'Garden maintenance', ...overrides });

test('two genuine requests from one email retain one contact and two enquiries', () => {
  const lab = new EnquiryLab();
  lab.accept(event());
  lab.accept(event({ ref: 'TEST-002', service: 'Fence repair' }));
  assert.equal(lab.snapshot().contacts, 1);
  assert.equal(lab.snapshot().enquiries, 2);
});

test('replaying the same event preserves its record and contact', () => {
  const lab = new EnquiryLab();
  const original = lab.accept(event());
  assert.deepEqual(lab.accept(event()).request, original.request);
  assert.equal(lab.snapshot().enquiries, 1);
  assert.equal(lab.snapshot().replays, 1);
});

test('different content under an existing reference is a conflict, not a silent success', () => {
  const lab = new EnquiryLab();
  lab.accept(event());
  const before = lab.snapshot();
  assert.throws(() => lab.accept(event({ service: 'Fence repair' })), /Reference conflict/);
  assert.deepEqual(lab.snapshot(), before);
});

test('same reference from a different source is a different enquiry', () => {
  const lab = new EnquiryLab();
  lab.accept(event());
  lab.accept(event({ source: 'booking' }));
  assert.equal(lab.snapshot().enquiries, 2);
});

test('demo email matching trims spaces and folds case', () => {
  const lab = new EnquiryLab();
  lab.accept(event());
  lab.accept(event({ ref: 'TEST-002', email: ' SAM@EXAMPLE.TEST ' }));
  assert.equal(lab.snapshot().contacts, 1);
});

test('different sample emails create different contacts', () => {
  const lab = new EnquiryLab();
  lab.accept(event());
  lab.accept(event({ ref: 'TEST-002', email: 'lee@example.test' }));
  assert.equal(lab.snapshot().contacts, 2);
});

test('invalid fields are rejected without mutating either collection', () => {
  const lab = new EnquiryLab();
  for (const invalid of [{ ref: '' }, { source: '../private' }, { email: 'sample@example.com' }, { service: '' }, { service: 'x'.repeat(121) }]) {
    assert.throws(() => lab.accept(event(invalid)));
  }
  assert.deepEqual(lab.snapshot(), { contacts: 0, enquiries: 0, replays: 0, requests: [] });
});

test('callers cannot mutate stored enquiries through returned objects', () => {
  const lab = new EnquiryLab();
  const input = event();
  const result = lab.accept(input);
  input.service = 'changed input';
  result.request.service = 'changed result';
  const snapshot = lab.snapshot();
  snapshot.requests[0].service = 'changed snapshot';
  assert.equal(lab.snapshot().requests[0].service, 'Garden maintenance');
});

test('a disabled rule preserves the record without send evidence', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  assert.equal(lab.notify('FORM-001').status, 'rule-disabled');
  assert.equal(lab.get('FORM-001').stored, true);
  assert.equal(lab.get('FORM-001').attempts, 0);
  assert.equal(lab.get('FORM-001').provider, 'None');
});

test('enabling a rule alone does not send the previously stored notification', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  lab.setEnabled(true);
  assert.equal(lab.get('FORM-001').attempts, 0);
});

test('retry records simulated acceptance while the mailbox remains unchecked', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  lab.setEnabled(true);
  assert.equal(lab.notify('FORM-001').status, 'simulated-accepted');
  assert.equal(lab.get('FORM-001').messageId, 'SIM-MSG-001');
  assert.equal(lab.get('FORM-001').mailbox, 'Not checked');
});

test('another notify click after acceptance does not create a second simulated attempt', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  lab.setEnabled(true);
  lab.notify('FORM-001');
  assert.equal(lab.notify('FORM-001').status, 'already-accepted');
  assert.equal(lab.get('FORM-001').attempts, 1);
  lab.submit('FORM-001');
  assert.equal(lab.get('FORM-001').attempts, 1);
});

test('mailbox evidence appears only after inspection of an attempted notification', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  assert.equal(lab.inspectMailbox('FORM-001').status, 'no-send-evidence');
  lab.setEnabled(true);
  lab.notify('FORM-001');
  assert.equal(lab.inspectMailbox('FORM-001').status, 'simulated-located');
  assert.match(lab.get('FORM-001').mailbox, /Simulated mailbox rule/);
});

test('a second reference cannot inherit the first reference send or mailbox evidence', () => {
  const lab = new NotificationLab();
  lab.submit('FORM-001');
  lab.setEnabled(true);
  lab.notify('FORM-001');
  lab.inspectMailbox('FORM-001');
  lab.setEnabled(false);
  lab.submit('FORM-002');
  assert.equal(lab.notify('FORM-002').status, 'rule-disabled');
  assert.equal(lab.get('FORM-002').messageId, null);
  assert.equal(lab.get('FORM-002').mailbox, 'Not checked');
  assert.equal(lab.get('FORM-001').messageId, 'SIM-MSG-001');
});

test('missing record and malformed reference cannot create a notification', () => {
  const lab = new NotificationLab();
  lab.setEnabled(true);
  assert.equal(lab.notify('MISSING').status, 'missing-record');
  assert.throws(() => lab.submit(''));
  assert.throws(() => lab.setEnabled('yes'));
  assert.equal(lab.snapshot().records.length, 0);
});

test('notification readbacks are copies and simulated message IDs are distinct', () => {
  const lab = new NotificationLab();
  lab.setEnabled(true);
  for (const ref of ['FORM-001', 'FORM-002']) { lab.submit(ref); lab.notify(ref); }
  lab.get('FORM-001').stored = false;
  lab.snapshot().records[0].attempts = 99;
  assert.equal(lab.get('FORM-001').stored, true);
  assert.equal(lab.get('FORM-001').attempts, 1);
  assert.notEqual(lab.get('FORM-001').messageId, lab.get('FORM-002').messageId);
});
