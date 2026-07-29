# AutoLog

AutoLog is a local-first vehicle maintenance application for tracking vehicles, service records, active issues, maintenance plans, document metadata, and operating costs.

Live application: https://omarmanas.github.io/autolog-public/

## Data and privacy

Application data is stored in the browser's IndexedDB database for the current origin. AutoLog has no cloud synchronization, and changing browsers, profiles, devices, or origins does not transfer local data automatically.

Document entries contain metadata only. AutoLog does not include binary document files in its JSON backups.

## Getting started

A fresh installation starts with an empty database and onboarding. You can:

- add your first vehicle;
- restore a validated AutoLog full-backup JSON file; or
- explicitly load a small fictional demo dataset.

The demo dataset is clearly marked and can be removed independently. Reset clears all local application stores and returns the app to empty onboarding without reseeding data.

## Backup and restore

The Settings screen exports a versioned full-application JSON backup with a SHA-256 payload checksum. The onboarding restore flow validates format, schema, counts, relationships, and checksum before replacing an empty local database atomically.

Backups are local files. Keep them in a secure location appropriate for the vehicle information they contain.

## Supported imports

The Import Wizard supports Excel workbook files in XLSX and legacy XLS formats.

## Local development

Prerequisite: Bun 1.3.14.

```bash
bun install --frozen-lockfile
bun run dev
```

Production build:

```bash
bun run build
```

Verification:

```bash
bun run lint
bunx vitest run
```
