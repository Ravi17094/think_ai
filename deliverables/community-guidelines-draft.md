# Client Learning Community — Community Guidelines (Draft)

**Deliverable type:** draft community guidelines for legal review.
**Status:** submitted for review
**Owner:** Client Legal Team <legal@clientdomain.com>
**Drafted:** 2026-09-21
**Contacts:** Support learning-support@clientdomain.com · Mailbox legal@clientdomain.com

> This draft is the human-readable companion to the pinned "Community Guidelines"
> announcement (`d-ann-guidelines`) and to the automated moderation policy configured in
> `backend/config/forum.config.js`. It is posted for review; the Client Legal Team owns
> final wording.

---

## 1. Our shared space

The client learning community is a safe place to ask, share and learn. Everyone — from the
newest learner to leadership — is expected to act on assumption of good intent and to
disagree constructively.

## 2. Be respectful

- Be kind and constructive in every reply.
- Assume good intent; challenge the idea, not the person.
- Harassment, intimidation and discriminatory language are not tolerated and may result in
  removal and reporting.
- Respect anonymity: never post another member's personal data.

## 3. Stay on topic

- Search before posting.
- Post in the right category (Announcements, Q&A, Help & Support, Projects, General).
- Tag posts so others can filter topics and search.
- No spam, self-promotion, or off-topic promotions.

## 4. Content filter

Posts and comments are checked against the platform's content filter
(`backend/config/client-blocked-terms.json`). Content that trips the filter is rejected with
`422 CONTENT_REVIEW_REQUIRED` and is never published.

## 5. Reporting and review

- Flag content you believe breaks these guidelines, with the reason provided. Moderators
  review **every** report.
- Moderation is automated up to a point and always human-reviewable:
  - 3 reports from distinct members within the review window → post is auto-flagged for
    review;
  - 5 reports from distinct members within the review window → post is auto-hidden while
    reviewed.
- Hidden content is not destroyed; a moderator can restore it after review.

## 6. Moderators

Community managers are listed in `backend/data/client-moderators-prod.csv` and appear on the
platform as Moderator role holders. They can hide content, warn members and view the report
ledger. Moderator actions (hide / unhide / warn) are communicated to affected members by
email.

## 7. Data and privacy

- Do not post personal data, DSARs, or data-classification records in open threads; use the
  Help & Support escalation path (learning-support@clientdomain.com).
- Vendor/security review material stays inside the Projects category and behind the
  security checklist (see "Vendor security review checklist" thread).

## 8. Changes to these guidelines

This is a living document. Changes are announced via the pinned Announcements in the
community and take effect after legal review.