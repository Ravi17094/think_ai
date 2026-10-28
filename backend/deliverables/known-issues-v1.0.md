# Thinkz AI Known Issues and Service Notes

## Purpose

This client-facing document records known limitations transparently. It uses plain language and does not expose credentials, security details, or internal infrastructure settings.

## Current items

| Type | What you may notice | Current workaround | Expected next step |
| --- | --- | --- | --- |
| Limitation | Live Studio video may show that a connection is unavailable in environments where the video-service URL is not configured. | Use the scheduled session information, attendance, chat, and instructor tools while video configuration is being completed. | Configure and verify the approved live-video service with the infrastructure team. |
| Limitation | Session-preparation checklist items can be saved on the mobile device when the session-checklist service is unavailable. | Continue using the on-device checklist during the session. | Enable server synchronization when the approved checklist API is available. |
| Limitation | Push notifications are not yet verified end-to-end for production delivery. | Use in-app status and scheduled-session communication. | Complete device registration and notification-service verification. |
| Access control | RBAC controls are available only to authorised Admin users. Instructor and TA accounts cannot open Admin permission controls. | Sign in with an approved Admin account for permission-management tasks. | No change planned; this is the intended security behaviour. |

## Reporting an issue

When reporting an issue, include:

1. The screen or feature being used.
2. What you expected to happen.
3. What actually happened.
4. Time and date of the issue.
5. A screenshot with any personal information hidden.

## Client communication

The Thinkz AI team will review confirmed issues, provide a workaround where available, and share an expected resolution only after it is validated by the responsible team.

## Review history

| Version | Date | Prepared by | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-10-27 | Raviteja | Initial Day 8 handover draft. |
