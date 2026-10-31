# ADR 006: Content Revision History and Revision-Bound Approvals

## Status
Accepted

## Context
In automated or AI-assisted content publishing (blogs, GBP updates, social posts, review replies):
- If an owner approves draft version 1, and subsequently an editor or automated agent updates the draft with new claims or prices, publishing the updated draft under the original approval violates owner consent.
- Similarly, if authoritative business facts change (e.g. business hours or phone number), previously approved drafts referencing old facts must not be published blindly.

## Decision
1. **Immutable Revisions**:
   All draft updates create a new, numbered revision (`revision_number: 1, 2, 3...`) in the database with timestamp, author, and content diff.
2. **Cryptographic Payload Hash Binding**:
   When an authorized approver approves a draft, an approval record is stored containing:
   - `revision_id` and `revision_number`.
   - `payload_hash`: SHA-256 hash of the exact rendered title, body, media URLs, and canonical destination.
   - `facts_version`: The active version of business facts at the moment of approval.
   - `approver_user_id` and `approved_at` timestamp.
3. **Pre-Dispatch Verification**:
   Immediately before worker dispatch to any publishing channel (WordPress, GBP, Meta):
   - The worker re-computes `SHA-256(current_payload)`.
   - If `current_hash !== approved_hash` or `current_facts_version !== approved_facts_version`, dispatch is **ABORTED**, the job is marked `APPROVAL_INVALIDATED`, and an actionable alert is posted to the owner.

## Alternatives Considered
1. *Mutable Drafts with a boolean `is_approved` column*: Dangerous; subsequent edits keep `is_approved = true`, publishing unreviewed changes.
2. *Full re-approval on every minor typo fix*: Handled gracefully by flagging diffs clearly in the UI so the owner can approve the new revision with a single click.

## Consequences
- Guarantees 100% compliance with business owner intent.
- Eliminates the risk of publishing out-of-date pricing, superseded operating hours, or unreviewed AI rewrites.
