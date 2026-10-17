import { EnquiryLab, NotificationLab } from '../src/models.mjs';

const crm = new EnquiryLab();
const first = { source: 'website', ref: 'TEST-001', email: 'sam@example.test', service: 'Garden maintenance' };
const second = { ...first, ref: 'TEST-002', service: 'Fence repair' };
crm.accept(first);
crm.accept(second);
crm.accept(second);
console.log(JSON.stringify({ stage: 'crm-after-retry', ...crm.snapshot() }, null, 2));

const form = new NotificationLab();
form.submit('FORM-001');
console.log(JSON.stringify({ stage: 'rule-disabled', ...form.notify('FORM-001') }, null, 2));
form.setEnabled(true);
console.log(JSON.stringify({ stage: 'enabled-only', ...form.get('FORM-001') }, null, 2));
console.log(JSON.stringify({ stage: 'retry', ...form.notify('FORM-001') }, null, 2));
console.log(JSON.stringify({ stage: 'mailbox-inspected', ...form.inspectMailbox('FORM-001') }, null, 2));
