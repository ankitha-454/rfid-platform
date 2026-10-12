# RFID Retail Intelligence Platform
*Real-Time Inventory Visibility Across Every Store* — prototype using **simulated** RFID data (no hardware).

## Run
```
cd server && npm i && cp .env.example .env && npm run seed && npm start
cd client && npm i && npm run dev     # http://localhost:5173
```
Needs MongoDB running locally. Demo logins (password `Password@123`): admin@rfidretail.com, manager@rfidretail.com, warehouse@rfidretail.com

## Architecture
RFID Tags → Readers → Gateway/Edge → `POST /api/rfid/events` → `services/rfid.js` (processing) → MongoDB → React.
The simulator (`POST /api/rfid/simulate`) calls the same service a real gateway would, so hardware can be added later without changing business logic.

## Business rules (services/rfid.js)
Scan → identify tag/reader → write event → update item location/status → misplaced-item check (zone ≠ expected) → low/out-of-stock check → alerts.
Transfers advance REQUESTED→…→IN_TRANSIT→RECEIVED; receiving writes ITEM_RECEIVED events and moves inventory.
Accuracy = items with an RFID scan in the last 7 days ÷ items on hand.

## Routing, roles and pages
React Router routes: `/login /dashboard /inventory /rfid-events /rfid-readers /stores /warehouses /products /transfers /alerts /analytics /traceability /settings`.
Sidebar and route access follow the role (Admin: all; Store Manager: no Products/Warehouses; Warehouse Manager: no Products/Stores/Analytics). A 401 from the API logs the user out.

## API additions
`GET /api/rfid/events?type&status&tag&location&page` (paginated), `GET /api/locations/stats?type=STORE|WAREHOUSE`, `GET /api/products` (includes `stock`), `GET /api/alerts?location=`.

## Client layout
`src/lib.jsx` (api client, toasts, fetch hook, states), `src/pages.jsx`, `src/pages2.jsx`, `src/App.jsx` (shell, global search, routes).

## Known gaps
Automated tests not written; frontend not build-verified (npm install timed out in the sandbox); transfer table lacks expected-arrival column; product CRUD UI is read-only.
