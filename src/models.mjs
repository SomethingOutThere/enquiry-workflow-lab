// Fictional-data teaching models. In-memory only; no CRM or email connection.
function reference(value, label = 'reference') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new TypeError(`${label} must contain 1-64 letters, digits, underscores or hyphens`);
  }
  return value;
}

function sampleEmail(value) {
  if (typeof value !== 'string') throw new TypeError('Email must be a string');
  const normalized = value.trim().toLowerCase();
  // Intentionally narrower than real email syntax. Use fictional data only.
  if (normalized.length > 254 || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.test$/.test(normalized)) {
    throw new TypeError('Use a fictional address ending in .test');
  }
  return normalized;
}

function cleanEvent(input) {
  if (!input || typeof input !== 'object') throw new TypeError('An event is required');
  const source = reference(input.source, 'source');
  const ref = reference(input.ref);
  const email = sampleEmail(input.email);
  if (typeof input.service !== 'string' || !input.service.trim() || input.service.length > 120) {
    throw new TypeError('Request must contain 1-120 characters');
  }
  return { source, ref, email, service: input.service.trim() };
}

export class EnquiryLab {
  #contacts = new Map();
  #requests = new Map();
  #replays = 0;

  accept(input) {
    const event = cleanEvent(input); // Validate before making any state changes.
    const key = JSON.stringify([event.source, event.ref]);
    const fingerprint = JSON.stringify([event.email, event.service]);
    const previous = this.#requests.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new Error('Reference conflict: the same source and reference has different content');
      }
      this.#replays += 1;
      return { status: 'replayed', request: { ...previous.request } };
    }

    let contactId = this.#contacts.get(event.email);
    if (!contactId) {
      contactId = `DEMO-CONTACT-${String(this.#contacts.size + 1).padStart(3, '0')}`;
      this.#contacts.set(event.email, contactId);
    }
    const request = Object.freeze({ ...event, contactId, owner: 'Demo owner' });
    this.#requests.set(key, { fingerprint, request });
    return { status: 'created', request: { ...request } };
  }

  snapshot() {
    return {
      contacts: this.#contacts.size,
      enquiries: this.#requests.size,
      replays: this.#replays,
      requests: [...this.#requests.values()].map(({ request }) => ({ ...request })),
    };
  }
}

export class NotificationLab {
  #enabled = false;
  #records = new Map();
  #messageSequence = 0;

  setEnabled(value) {
    if (typeof value !== 'boolean') throw new TypeError('Rule value must be boolean');
    this.#enabled = value; // A configuration change alone does not send anything.
  }

  submit(ref) {
    reference(ref);
    if (this.#records.has(ref)) return this.get(ref);
    this.#records.set(ref, {
      ref,
      browser: 'Accepted by local demo',
      stored: true,
      attempts: 0,
      messageId: null,
      provider: 'None',
      mailbox: 'Not checked',
    });
    return this.get(ref);
  }

  notify(ref) {
    const record = this.#records.get(reference(ref));
    if (!record) return { status: 'missing-record' };
    // Repeated UI clicks cannot create another simulated send after acceptance.
    if (record.messageId) return { status: 'already-accepted', record: this.get(ref) };
    if (!this.#enabled) return { status: 'rule-disabled', record: this.get(ref) };
    record.attempts += 1;
    record.messageId = `SIM-MSG-${String(++this.#messageSequence).padStart(3, '0')}`;
    record.provider = 'Simulated: accepted by server';
    return { status: 'simulated-accepted', record: this.get(ref) };
  }

  inspectMailbox(ref) {
    const record = this.#records.get(reference(ref));
    if (!record?.messageId) return { status: 'no-send-evidence' };
    record.mailbox = 'Simulated mailbox rule: Enquiries folder';
    return { status: 'simulated-located', record: this.get(ref) };
  }

  get(ref) {
    const record = this.#records.get(reference(ref));
    return record ? { ...record } : null;
  }

  snapshot() {
    return { enabled: this.#enabled, records: [...this.#records.values()].map(r => ({ ...r })) };
  }
}
