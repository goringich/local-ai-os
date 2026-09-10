# LOCAL AI OS working rules

## Product authority first

This repository is the public product/release implementation for LOCAL AI OS. It is not the authority for the whole private system.

Before any product, pricing, commercial, delivery, installer, package, onboarding, marketing-promise or customer-runtime change:

1. Read current `main`, `docs/product-manifest.json`, `docs/offer.md`, `docs/growth-readiness.md`, and the relevant current product/release docs.
2. Inspect all open pull requests whose scope can overlap the requested outcome. Re-read their literal current head/base and changed files; PR prose alone is not authority.
3. If the owner asks to use "our system", "the system", existing system knowledge, portfolio/revenue state, or cross-repository capabilities, route through the canonical Product Operating System / Task Context authority in `goringich/__home_organized` before inventing product scope.
4. Write down the current product identity, lifecycle stage, primary wedge, canonical delivery path, active overlapping workstream, and the exact gap that remains. If any of these is unknown because context was blocked or unavailable, do not create a new product/delivery surface from partial evidence.

## Reuse before build

The decision order is:

`reuse existing capability -> finish existing workstream -> extend canonical surface -> create a new surface only with explicit evidence that the canonical path cannot satisfy the validated outcome`.

Hard rules:

- Do not create a sibling `delivery/`, installer, customer package, pilot app, assistant, RAG prototype, entitlement path, pricing ladder or fulfillment mechanism merely because it is quick to implement.
- Existing accepted or active customer-package work owns package/install/doctor/acceptance/rollback/uninstall mechanics. Extend or complete that lane rather than building a parallel mini-product.
- A narrow experiment is allowed only when it tests an unresolved product hypothesis and is explicitly classified as a lab/fixture. It must not silently become the product offer, delivery contract or pricing basis.
- Marketing may simplify the buyer-facing promise, but the deliverable must still be backed by the canonical product capability. Do not replace the product with an easier demo.
- Existing system capabilities are implementation leverage. Do not reimplement a weaker local substitute when a current system/product capability already exists.

## Context degradation is fail-closed

If Task Context, product authority, required system policy, repository evidence, or an overlapping workstream cannot be read because of a hook, permission, connector, network or index failure:

- treat it as `unknown`, not as permission to improvise;
- use an approved alternate read path such as tracked GitHub source when available;
- continue analysis only as far as evidence supports;
- do not publish, price, package or implement a new competing product surface until authority is restored.

A blocked context read is never evidence that the capability or workstream does not exist.

## Current commercial truth

The current canonical entry offer is the founder-led diagnostic in `docs/offer.md`, credited toward the bounded pilot. Manual founder-led fulfillment is valid first-revenue evidence when truthful; zero-touch customer delivery is a later milestone and must not be manufactured before demand is proven.

Do not claim customer activation, revenue, production installation, broad autonomy or self-service readiness without the exact external/live evidence required by the product manifest and repository gates.

## Customer-package convergence

Before changing customer delivery, inspect the merged deterministic foundation and every still-open customer-package PR. The canonical target remains one coherent lifecycle:

`compatibility -> verify -> install -> doctor -> acceptance -> updates/recovery -> rollback/uninstall`.

Signed release/entitlement, trust-boundary, package-integrity and customer/private-data rules belong to that lifecycle. Do not create a second delivery architecture beside it.

## Completion

A task is not complete because a prototype, ZIP, video, page or script exists. Preserve the distinction:

`source -> tests -> CI -> merge -> deploy/install -> verified live -> customer value -> revenue`.

For commercial work, prefer the shortest truthful path to a paid and accepted outcome over additional speculative infrastructure.