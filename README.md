# Enquiry workflow lab

A local, fictional-data teaching project prepared by Something Out There. It explores two practical questions:

1. Can one contact send two different enquiries without losing the second request?
2. Can a form accept and store a request without an email reaching the inbox?

This is a refactor of the working local demo used in the studio's October 2026 walkthroughs. It is **not a CRM integration, email service, production template or client case study**. No n8n workflow is used.

## Run

Use Node.js 22 or later for the tests and Python 3 for the optional browser server. The verified environment used Node.js 26.7.0 and Python 3.12. There are no third-party packages and no install step.

From this directory:

```sh
node test/models.test.mjs
node examples/walkthrough.mjs
python -m http.server 8767 --bind 127.0.0.1
```

On Windows, `py -3` can replace `python` if that is how Python is installed. Open:

- CRM lab: <http://127.0.0.1:8767/?demo=crm>
- Notification lab: <http://127.0.0.1:8767/?demo=form>

Stop the local server with Ctrl+C. Serve only this extracted folder, not a directory containing private files. Do not open the HTML directly with a `file:` URL: the browser needs HTTP to load the ES modules reliably.

## Reproduce the two main scenarios

**CRM:** Process `TEST-001`, load the second request, process `TEST-002`, then retry. Expected: one contact, two enquiries, one ignored replay. Reuse `TEST-002` with a different request body to see an explicit reference conflict.

**Notification:** Submit `FORM-001` with the rule disabled. The record exists, but there is no send attempt. Enable the rule; that alone changes no delivery evidence. Retry notification, then inspect the sample mailbox. Acceptance and mailbox inspection are separate states. Repeat the notification action to verify it does not create a second simulated attempt after acceptance.

All email addresses must end in `.test`. Values are retained only in page memory; refresh or Reset lab clears them. Use fictional input only. No data is sent to a CRM, an email provider, a database, analytics or a remote endpoint.

## Files

| File | Purpose |
|---|---|
| `index.html` | Responsive local browser interface |
| `src/models.mjs` | Shared in-memory business rules |
| `src/app.mjs` | DOM interaction using those same rules |
| `test/models.test.mjs` | 16 behavioral tests |
| `examples/walkthrough.mjs` | Reproducible console walkthrough |
| `docs/tutorial.md` | Complete educational tutorial draft, including AI disclosure |
| `docs/limitations.md` | Production boundaries and changes from the original demo |
| `QA.md` | Test and browser verification evidence |
| `SANITIZATION.md` | Reviewed package contents and exclusions |
| `LICENSE` | MIT license |

The `npm test` and `npm run demo` scripts are equivalent shortcuts if npm is installed. The test command runs Node's built-in `node:test` tests in the current process, avoiding child-process restrictions in some local sandboxes.

## Scope and reuse

No credentials, private website source, personal profiles, browser captures, customer records, external dependencies or scheduled-post content belong in this package. The UI is deliberately unbranded so it can support an educational tutorial without a commercial CTA.

The code and writing were prepared with AI assistance, then checked through automated tests and a local browser walkthrough. A human publisher still needs to review the technical claims and choose the public author identity before publishing the DEV article.

Published by the SomethingOutThere organization under the MIT license. See `LICENSE`. The canonical repository is https://github.com/SomethingOutThere/enquiry-workflow-lab.

The initial commit uses the studio name and `studio@example.invalid`, a deliberately non-contact address, to avoid personal attribution in commit metadata. `private: true` prevents accidental npm publication; it does not control GitHub visibility.
