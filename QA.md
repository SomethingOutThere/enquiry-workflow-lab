# Verification record

Verified locally on 17 October 2026 using Node.js 26.7.0, Python 3.12 and the connected Brave browser.

## Automated behavior checks

Command: `node test/models.test.mjs`

Result: **16 tests passed, 0 failed**. See `test/models.test.mjs` for the complete assertions. The suite checks contact/request identity, replay behavior, conflicts, source boundaries, validation, state isolation, disabled rules, explicit notification attempts and per-reference evidence.

The initial command `node --test test/models.test.mjs` could not start its child process in the restricted local environment (`spawn EPERM`). Running the same `node:test` suite directly in the current process succeeded. `npm test` uses the successful command. This was an environment launch restriction, not a failed assertion.

Command: `node examples/walkthrough.mjs`

Observed: one contact, two enquiries, one replay; the disabled rule and enable-only stages both have zero attempts; retry creates one simulated message ID; mailbox evidence appears only after explicit inspection. This console walkthrough executed successfully.

## Browser verification

Served this folder on loopback port 8767 and exercised the actual controls:

| Scenario | Observed result |
|---|---|
| Process first request, second request, then retry | 1 contact, 2 enquiries, 1 replay |
| Change content under the second reference | Explicit conflict; original rows unchanged |
| Submit form with rule disabled | Stored record, no send attempt, mailbox unchecked |
| Enable rule without retry | No attempt or delivery evidence added |
| Retry notification | `SIM-MSG-001`, simulated provider acceptance, mailbox unchecked |
| Inspect mailbox | Simulated Enquiries folder shown |
| Retry again | Existing simulated message retained; no second attempt |
| Submit a different reference with rule disabled | No inherited send, provider or mailbox evidence |
| Reset lab | No active record; initial empty state restored |

Desktop rendering was visually inspected. Screenshots and UI readbacks stay outside this public package. A full-page screenshot attempt timed out; a normal viewport capture succeeded. Mobile breakpoints, assistive technology, other browsers and real integrations have not been verified.

## Verification scope

The tests and browser checks establish behavior of the supplied local simulation. They do not validate production reliability, delivery, concurrency, accessibility conformance, security or business outcomes. See `docs/limitations.md` before adapting the code.
