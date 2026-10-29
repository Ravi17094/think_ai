# Certificate generation: local-development fix

The learner's course and assessment were complete, but generation required an S3
bucket. Both the Desktop project and the browser preview had no certificate bucket
configured, leaving a certificate record without a PDF and a retrying GENERATE job.

The Desktop project and prepared preview now explicitly enable:

    LMS_LOCAL_DEVELOPMENT=true
    LMS_CERTIFICATE_STORAGE=local

Only development mode accepts this storage setting. Completion, enrollment and
ownership checks still apply. The PDF is saved under backend/.local/certificates,
outside public static directories. The owned authenticated metadata endpoint issues
a certificate-scoped, five-minute signed download URL; expired, modified and wrong-ID
links are rejected. Signed PDF URLs are excluded from backend request logs.

Local-ready jobs are marked LOCAL_READY and do not attempt SendGrid delivery.
PDFs use the current template and its local/client-approval-pending label.
This is not actual S3 storage, inbox delivery or approved client branding.

Fresh verification: 166 backend LMS tests, 475 mobile tests/45 suites and TypeScript
passed. Actual generation/download passed against both local databases. The browser
Save/share PDF action produced a real PDF download. Missing/expired download links
were rejected. The local database jobs finished LOCAL_READY with no generation error.

Refresh the app, open My profile, and select Open certificate. In the prepared
browser preview the page is http://localhost:8086/learner/certificates/1.
Use Save / share PDF to open/download it. Email delivery remains disabled locally.

For real S3 delivery, use the approved bucket/AWS access and S3 mode. Actual email
also needs a verified SendGrid sender/key and real receipt acceptance. Local mode
cannot be enabled in NODE_ENV=production. Existing NOT_RUN cloud reports were preserved.
