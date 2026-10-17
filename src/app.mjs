import { EnquiryLab, NotificationLab } from './models.mjs';

const $ = id => document.getElementById(id);
let enquiries = new EnquiryLab();
let notifications = new NotificationLab();
let lastEvent = null;
let activeRef = null;

function drawCRM() {
  const state = enquiries.snapshot();
  $('contacts').textContent = state.contacts;
  $('enquiries').textContent = state.enquiries;
  $('retries').textContent = state.replays;
  const body = $('records');
  body.replaceChildren();
  if (!state.requests.length) {
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.className = 'muted';
    cell.textContent = 'No requests processed yet.';
    const row = document.createElement('tr');
    row.append(cell);
    body.append(row);
  }
  for (const request of state.requests) {
    const row = document.createElement('tr');
    for (const value of [request.ref, request.service, request.owner]) {
      const cell = document.createElement('td');
      cell.textContent = value; // Show user-entered text; never interpret it as markup.
      row.append(cell);
    }
    body.append(row);
  }
}

function process(event) {
  try {
    const result = enquiries.accept(event);
    lastEvent = { ...event };
    $('crmnotice').textContent = result.status === 'created'
      ? `${event.ref} saved. Contact matched by email; enquiry kept as its own record.`
      : `${event.ref} already exists. Replayed delivery ignored; original requests stay intact.`;
  } catch (error) {
    $('crmnotice').textContent = error.message;
  }
  drawCRM();
}

$('submit').onclick = () => process({ source: 'website', email: $('email').value, ref: $('ref').value, service: $('service').value });
$('retry').onclick = () => {
  if (lastEvent) process({ ...lastEvent });
  else $('crmnotice').textContent = 'Process a sample enquiry before retrying it.';
};
$('next').onclick = () => {
  $('ref').value = 'TEST-002';
  $('service').value = 'Fence repair';
  $('crmnotice').textContent = 'Same person, different request. TEST-002 must create a new enquiry.';
};
$('resetcrm').onclick = () => {
  enquiries = new EnquiryLab();
  lastEvent = null;
  $('email').value = 'sam@example.test';
  $('ref').value = 'TEST-001';
  $('service').value = 'Garden maintenance';
  $('crmnotice').textContent = 'Start with TEST-001. Each accepted request gets a separate record.';
  drawCRM();
};

function stage(id, text, status = '') {
  $(id).querySelector('span').textContent = text;
  $(id).className = `step ${status}`;
}

function drawForm() {
  const record = activeRef ? notifications.get(activeRef) : null;
  $('currentref').textContent = activeRef ?? 'No active record';
  stage('browser', record?.browser ?? 'Not submitted', record ? 'good' : '');
  stage('storage', record ? `${record.ref}: saved` : 'None', record ? 'good' : '');
  stage('attempt', record?.messageId ? `${record.messageId}: simulated attempt` : (record ? 'No send attempt' : 'None'), record?.messageId ? 'good' : (record ? 'bad' : ''));
  stage('provider', record?.provider ?? 'None', record?.messageId ? 'good' : '');
  stage('mailbox', record?.mailbox ?? 'Not checked', record?.mailbox.startsWith('Simulated mailbox') ? 'good' : '');
}

function attemptNotification() {
  if (!activeRef) {
    $('formnotice').textContent = 'No stored record. Submit a fictional enquiry first.';
    return;
  }
  notifications.setEnabled($('rule').value === 'on');
  const result = notifications.notify(activeRef);
  $('formnotice').textContent = {
    'rule-disabled': 'Record preserved. No send attempt exists. Check the notification rule before mailbox settings.',
    'simulated-accepted': 'Simulated notification attempted from the stored record. Server acceptance is not proof a person saw it.',
    'already-accepted': 'This simulation already recorded acceptance. Another click does not create another attempt.',
  }[result.status] ?? 'No stored record.';
  drawForm();
}

$('sendform').onclick = () => {
  try {
    const record = notifications.submit($('formref').value);
    activeRef = record.ref;
    attemptNotification();
  } catch (error) {
    $('formnotice').textContent = error.message;
  }
};
$('rule').onchange = () => notifications.setEnabled($('rule').value === 'on');
$('recover').onclick = attemptNotification;
$('checkmail').onclick = () => {
  const result = activeRef ? notifications.inspectMailbox(activeRef) : { status: 'no-send-evidence' };
  $('formnotice').textContent = result.status === 'simulated-located'
    ? 'Simulated message found in a rule-controlled folder. Use real provider evidence for a real fault.'
    : 'No send attempt for this record. Investigate that before mailbox settings.';
  drawForm();
};
$('resetform').onclick = () => {
  notifications = new NotificationLab();
  activeRef = null;
  $('formref').value = 'FORM-001';
  $('rule').value = 'off';
  $('formnotice').textContent = 'Nothing submitted. Start with the notification rule disabled.';
  drawForm();
};

if (new URLSearchParams(location.search).get('demo') === 'form') {
  $('crm').classList.add('hidden');
  $('form').classList.remove('hidden');
}
drawCRM();
drawForm();
