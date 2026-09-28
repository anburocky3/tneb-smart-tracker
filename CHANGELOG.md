# Changelog

All notable changes to Smart EB Tracker are documented here.

## 2026-09-28 - Manual Log Reading and future forcasting

### Added

- Manual meter reading capture with reading date and current kWh validation.
- Authenticated `GET /api/readings?consumerNo=...` and `POST /api/readings` endpoints backed by Firestore.
- Same-day reading replacement for the same authenticated consumer connection, preventing duplicate records.
- 60-day bi-monthly projection engine with Tamil Nadu domestic tariff calculation.
- Forecast cards showing projected units, projected bill, free-unit budget, daily allowance, and progress toward the 200-unit free slab.
- Dashboard reading actions on meter cards and the individual meter detail page.
- Same-location load-shift recommendations with estimated bill savings.
- Guest-facing README documentation explaining the product workflow, data requirements, limitations, and forecast behavior.

### Validation

- Manual readings cannot be lower than the official cycle-start kWh value.
- Reading dates cannot be in the future or before the cycle start date.
- TNEB `DD/MM/YYYY` dates and normalized ISO dates are supported.
