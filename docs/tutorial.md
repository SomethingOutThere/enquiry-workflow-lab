# One contact, two enquiries: testing retries and notification evidence in JavaScript

**AI assistance disclosure:** This tutorial and its demo code were prepared with AI assistance. The included examples and 16 behavioral tests were run, and the browser interface was exercised against the same model. Readers should review and understand the implementation before adapting or republishing it. The DEV article remains a draft; this repository supplies its reproducible source.

A useful enquiry workflow has to distinguish three things: a person, a request, and another attempt to process that request. Collapsing all three into an email address can hide a legitimate second enquiry. Treating every attempt as new can create duplicates.

There is a related distinction in contact forms: accepting a submission is different from storing it, attempting a notification, receiving a provider response, or locating a message in a mailbox. A green success message cannot explain every later stage.

This tutorial builds a small executable model of those distinctions. It uses fictional data, plain JavaScript and Node's built-in test tools. It sends no email and connects to no CRM. The scenarios are teaching experiments, not client work or evidence of business results.

## 1. Run the supplied project

Get the source from [https://github.com/SomethingOutThere/enquiry-workflow-lab](https://github.com/SomethingOutThere/enquiry-workflow-lab), using **Code > Download ZIP**, then extract it and open a terminal inside the extracted repository folder. You can also clone the repository with Git.

The project has no third-party dependencies or installation step. Use Node.js 22 or later and Python 3 if you want the browser interface. The verified environment used Node.js 26.7.0 and Python 3.12. Other versions have not been tested for this draft.

```sh
node test/models.test.mjs
node examples/walkthrough.mjs
python -m http.server 8767 --bind 127.0.0.1
```

On Windows, `py -3` may replace `python`. The first command executes the suite in the current process. Node documents the built-in runner and assertions in its [test runner reference](https://nodejs.org/api/test.html). No package installation is needed.

With the server running, visit:

- `http://127.0.0.1:8767/?demo=crm`
- `http://127.0.0.1:8767/?demo=form`

Serve only the extracted demo folder, since a development server exposes files within that folder. It is bound to the local machine. Stop it with Ctrl+C. Open the page through HTTP so its JavaScript modules load correctly.

The files have distinct jobs:

| File | Responsibility |
|---|---|
| `src/models.mjs` | State transitions and validation |
| `src/app.mjs` | Buttons, fields and rendering |
| `test/models.test.mjs` | Behavioral checks |
| `examples/walkthrough.mjs` | Repeatable console scenario |

The UI imports the same classes as the tests. That matters: testing a second implementation would say little about what the buttons actually do.

## 2. Give contacts and requests different identities

The contact key in this deliberately small model is a trimmed, lowercased fictional email. The enquiry key is a pair: source and reference. For example:

| Contact | Source | Reference | Request |
|---|---|---|---|
| `sam@example.test` | `website` | `TEST-001` | Garden maintenance |
| `sam@example.test` | `website` | `TEST-002` | Fence repair |

The expected result is one contact with two enquiries. A third arrival of `TEST-002` with the same content is a replay, not a third enquiry. An arrival with reference `TEST-002` but different content is a conflict requiring investigation.

The `.test` domain is reserved for testing in the [IANA special-use domain registry](https://www.iana.org/assignments/special-use-domain-names). The model accepts only a narrow `.test` address pattern. This is a guardrail for fictional input, not a general-purpose email validator.

Here is the relevant part of `EnquiryLab.accept()`:

```js
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
```

Serializing a fixed two-element array avoids ambiguity from casually joining strings with a separator. The source is part of the identity: `website/TEST-001` and `import/TEST-001` are different events in this model.

The fingerprint compares the selected, normalized content fields. It is not encryption, a cryptographic digest, or a general JSON canonicalization algorithm. If the event schema grows, the fingerprint policy must be revisited. Decide explicitly which changes constitute a conflict.

Validation precedes all mutations. The replay and conflict branches run before creating a contact. This prevents a conflicting event with a different address from accidentally adding an unused contact.

For a new request, the method creates a contact only if that email has not been seen, associates the request with its contact ID, and stores it. Returned objects are copies. Callers cannot change stored state by editing a returned request.

Email matching here is a teaching convention. A real identity policy must account for shared inboxes, aliases, changed addresses, case handling and tenant boundaries. Do not lift this convention into production without deciding what a contact actually means in that system.

## 3. Reproduce the contact scenario

The first part of `examples/walkthrough.mjs` is executable:

```js
import { EnquiryLab, NotificationLab } from '../src/models.mjs';

const crm = new EnquiryLab();
const first = { source: 'website', ref: 'TEST-001', email: 'sam@example.test', service: 'Garden maintenance' };
const second = { ...first, ref: 'TEST-002', service: 'Fence repair' };
crm.accept(first);
crm.accept(second);
crm.accept(second);
console.log(JSON.stringify({ stage: 'crm-after-retry', ...crm.snapshot() }, null, 2));
```

The printed snapshot contains `contacts: 1`, `enquiries: 2`, and `replays: 1`. Both requests point to `DEMO-CONTACT-001`, and the second request remains Fence repair.

To observe the same behavior in the browser:

1. Open the CRM lab and process `TEST-001`.
2. Select **Load second request**, then process it.
3. Select **Retry last event**.
4. Confirm one contact, two enquiries and one replay.
5. Keep `TEST-002`, change its request selection, and process it again.

The last step displays a reference conflict. The existing two request rows remain unchanged. That explicit failure is useful: quietly ignoring changed content would conceal a disagreement about what the reference means.

## 4. Model notification evidence per reference

The notification model has a record for each submission reference. A new record starts like this:

```js
{
  ref,
  browser: 'Accepted by local demo',
  stored: true,
  attempts: 0,
  messageId: null,
  provider: 'None',
  mailbox: 'Not checked',
}
```

These fields answer separate questions. The browser field describes the local demo's acknowledgement. `stored` means a JavaScript object exists in memory, not that it has been durably committed to a database. The attempt counter and message ID represent a simulated notification attempt. The provider and mailbox fields are also synthetic.

Configuration is separate from execution. Calling `setEnabled(true)` changes the rule; it does not send an old request. An explicit retry is required. This makes the recovery step visible and testable.

The notification method applies guards in this order:

```js
const record = this.#records.get(reference(ref));
if (!record) return { status: 'missing-record' };
if (record.messageId) return { status: 'already-accepted', record: this.get(ref) };
if (!this.#enabled) return { status: 'rule-disabled', record: this.get(ref) };
record.attempts += 1;
record.messageId = `SIM-MSG-${String(++this.#messageSequence).padStart(3, '0')}`;
record.provider = 'Simulated: accepted by server';
return { status: 'simulated-accepted', record: this.get(ref) };
```

An already accepted simulation does not create another attempt when someone clicks twice. A disabled rule preserves the original record. A missing reference cannot be notified.

The mailbox state changes only when `inspectMailbox(ref)` is called after an attempt exists. In the simulation, it becomes “Simulated mailbox rule: Enquiries folder.” This is a hard-coded teaching outcome. No inbox has been searched, no message was delivered, and no person is known to have read anything.

## 5. Reproduce the notification scenario

The second half of the console example creates `NotificationLab`, submits `FORM-001`, and prints each transition. These are the observed values:

| Action | Stored | Attempts | Message ID | Mailbox |
|---|---|---:|---|---|
| Submit, rule disabled | Yes | 0 | None | Not checked |
| Enable rule only | Yes | 0 | None | Not checked |
| Retry notification | Yes | 1 | `SIM-MSG-001` | Not checked |
| Inspect sample mailbox | Yes | 1 | `SIM-MSG-001` | Simulated Enquiries folder |
| Retry again | Yes | 1 | Same ID | Same simulated location |

In the browser, start with the rule disabled. Submit the test, enable the rule, retry, and inspect the sample mailbox. Observe the evidence after each click. Then retry again and confirm the same ID remains.

Finally, change the reference to `FORM-002`, disable the rule and submit it. The new record has no attempt, no provider response and no mailbox evidence. It cannot inherit the first record's status.

When investigating an actual system, use an authorized synthetic submission with a unique reference and follow that reference through the available application and provider records. Identify the earliest missing evidence before choosing a recovery action. Do not assume this demo's field names or transitions match a particular form plugin or email provider. Their documented event semantics govern what each log actually proves.

## 6. Test behavior that could lose or duplicate a request

The 16 tests cover distinct invariants, including:

- a second enquiry from the same contact remains a second enquiry;
- identical retries preserve the original request;
- conflicting content causes no state mutation;
- equal references from different sources remain distinct;
- invalid input cannot partially create records;
- returned object edits cannot mutate stored state;
- enabling a rule alone does not attempt a notification;
- repeated acceptance cannot create a second simulated attempt;
- mailbox inspection requires send evidence;
- separate form references retain separate evidence.

These are assertions about outcomes, not snapshots of the UI's exact wording. Both the happy path and cases that could silently discard or duplicate work have coverage. All 16 passed in the verified environment. See `QA.md` for the commands and browser checks.

The tests do not establish that a real integration is reliable. They demonstrate what this model does for the specified inputs. Changing the production design requires additional tests around its actual storage, concurrency and provider contracts.

## 7. Know where the model stops

A synchronous `Map` is not a durable idempotency system. All state disappears after refresh or restart. Two browser tabs have separate maps. Two workers checking and inserting independently could both proceed. The model does not make external actions atomic.

A production design needs a durable uniqueness boundary. For example, PostgreSQL supports unique constraints over groups of columns, which can express a `(source, reference)` uniqueness rule. A constraint is only one part of the design: the record transaction, conflict policy and side-effect handling still need to be implemented and tested. See the [PostgreSQL constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html).

The harder notification case is an ambiguous timeout: a provider may accept a message while the caller loses the response. This lab cannot produce that situation because there is no network. A real retry strategy needs the provider's documented idempotency behavior and a way to reconcile uncertain attempts. It also needs durable work tracking, bounded retries and an operational recovery policy. This tutorial implements none of those mechanisms and does not promise exactly-once delivery.

Authentication, authorization, webhook signatures, tenant isolation, retention, rate limits, email authentication and monitoring are also outside this package. The page uses `textContent` for dynamic values and a local content security policy, but those precautions are not a security audit.

The original working visual demo used one form state and simpler duplicate handling. This package extracts shared classes and adds explicit conflicts, source-scoped references, returned-object isolation and per-reference notification evidence. Those are changes in this package, not claims about earlier video footage or an unseen client system.

There is no n8n workflow, production connection, analytics collection, or performance benchmark. Use the model to write down the invariants you need, then verify those invariants against the real system you are authorized to work on.

## Try one controlled extension

Add a second source in the console example using the same reference. Predict the contact and enquiry counts before running it. Then add a test for that expectation. This makes the identity boundary concrete before any external integration is introduced.

Before adapting the model, decide which content belongs in its fingerprint and how a conflict should be handled. A clear answer to those questions is more useful than silently treating every repeated email or reference as a duplicate.
