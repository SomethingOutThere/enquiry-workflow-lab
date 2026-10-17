# Limits and provenance

## Relationship to the original walkthroughs

The original working browser demo used a `Set` of contact emails, a `Map` of submission references, and a single form's notification state. Its buttons were exercised to produce the fictional screenshots used in the campaign videos.

This package retains the two teaching scenarios but extracts the state into tested JavaScript classes shared by the UI and console examples. It additionally:

- validates fictional inputs before mutation;
- scopes enquiry references by source;
- treats changed content under an existing reference as a conflict;
- returns copies instead of exposing mutable stored records;
- tracks each form reference separately;
- prevents another simulated attempt after recorded acceptance;
- makes the UI responsive and announces status changes;
- uses `textContent` for dynamic values and blocks network connections with a content security policy.

Those added behaviors are package improvements. They are not claims about unseen production systems or additional results shown in the already-produced videos.

## What this proves

The tests demonstrate the behavior of this synchronous, single-process in-memory code for the inputs named in the tests. The browser walkthrough checks that the controls use that same logic. The package is useful for describing desired behavior before choosing a provider or implementing an integration.

## What this does not prove

- No persistence: a refresh, process restart or reset destroys all records.
- No multi-worker concurrency, transaction isolation or atomic external side effects.
- No real webhooks, signatures, authentication, authorization, tenant isolation or rate limits.
- No real CRM identity resolution. Email lowercasing is an explicit demo convention, not a universal identity rule. Shared inboxes, aliases and changed addresses require a business policy.
- No general email validator. Only a deliberately limited `.test` pattern is accepted.
- No durable outbox, queue, backoff, retry budget, dead-letter queue or recovery job.
- No network timeout after a provider accepts a send, so the hard ambiguous-outcome problem is absent. A real provider's idempotency contract and message reconciliation are necessary.
- No message delivery, spam filtering, bounce, deferral, quarantine, read receipt or email authentication check. All provider and mailbox states are synthetic.
- No uptime, throughput, conversion, SEO, security audit or client outcome claim.
- No n8n runtime or workflow export.

The reference conflict guard compares two selected, normalized fields. It is not a cryptographic hash and is not a complete canonicalization scheme for arbitrary JSON. A real system needs a defined schema, source namespace, uniqueness boundary, retention window and conflict/recovery policy.

The browser CSP is a local precaution, not a production security architecture. Python's development server serves this folder and is bound to loopback; it is not a production web server.
