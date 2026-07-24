# Public data safety checklist

Before publishing or deploying this repository with real data, verify that:

- repository history contains no real credentials or exported production data;
- application secrets are supplied outside Git;
- bootstrap/schedule data is not readable without authentication;
- stored attachments are not readable without authentication;
- sample configuration uses placeholders rather than production resource identifiers;
- screenshots, test fixtures, logs, OCR samples, and database dumps do not contain personal or operational information.
