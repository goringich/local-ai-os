# Public proof contract

A public proof is a reviewed, public-safe summary of one workflow. It is not a raw run report and never substitutes for customer acceptance.

Required fields are typed in `src/proofs/types.ts` and validated by `npm run check:proofs`:

- pseudonymous ID, workflow, status, capture date, version, and public approval;
- before and assisted metrics; a missing value is exactly `unavailable`;
- changed-file categories only, never source paths or source code;
- verification evidence for every `verified` proof;
- limitations and share text.

Forbidden content includes private paths, prompts, responses, credentials, cookies, secret values, runtime logs, PII, unapproved repository names, and customer source. A founder proof must say that it is founder-operated and not a customer case study.
