# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this project is
A native **WeChat Mini-Program** for small-merchant membership management, backed by **WeChat Cloud Development** (cloud functions + cloud database). No standalone server.

## Setup
- Open the project in **WeChat DevTools** (微信开发者工具).
- Set your own AppID in `project.config.json`.
- Enable a Cloud Development environment; deploy each function under `cloudfunctions/`.
- Configure WeChat Pay merchant id / key in **cloud environment variables**, never in source.

## Project layout
- `miniprogram/` — front end. Pages under `miniprogram/pages/*` (`index`, `member`, `account`, `data`). Global config in `app.js/app.json/app.wxss`.
- `cloudfunctions/` — one folder per cloud function: `addMember`, `getMemberList`, `createPaymentOrder`, `paymentCallback`, `shopRegister`, `checkPermission`, `getStatsOverview`, `getShopInfo`, `updateShopInfo`, `getPaymentHistory`, `trialExpiryReminder`.
- `DEVELOPMENT_LOG.md` — database schema (collections `shops`, `members`, `transactions`) and indexes.

## Conventions
- Cloud functions use `wx-server-sdk` with `cloud.DYNAMIC_CURRENT_ENV`.
- All business data is stored in the cloud database keyed by `shopId`; local storage is cache only.
- Money is stored in cents (分). Plans: monthly/quarterly/yearly/permanent + 12-day trial.

## Secrets
- WeChat Pay credentials live in cloud env vars, not in code.
- `project.private.config.json` is gitignored.

## Don't
- Don't hardcode AppID secrets, mch_id, or pay keys in source.
- Don't commit `node_modules/`, `miniprogram_npm/`, or `project.private.config.json`.
