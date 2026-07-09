# pp-tools Online Suite Design

Date: 2026-07-09
Status: Draft for review

## Summary

`pp-tools` is an independent online tool suite. It turns three existing local or platform-specific tools into browser-accessible web products:

1. Delta Force Stats: upload result screenshots, run server-side recognition, and view a structured match profile.
2. Gesture Beauty Cam: run webcam effects directly in the browser with no server upload.
3. Sanpingfang Milk Tea: browse products, customize drinks, place orders, and manage shop data through a web admin view.

The personal homepage stays separate. It will link to the new online tools, while this project owns the actual product experience, backend APIs, data, and deployment.

## Goals

- Provide a real online product that users can open in a browser and use without downloading desktop packages.
- Preserve the core value of the existing three tools while adapting them to web constraints.
- Use a clean front-end and back-end split so recognition, ordering, and admin features are maintainable.
- Keep the first release focused on a complete web equivalent of the core workflows.
- Leave a clear path for future LLM-powered workflow features after the online tools are stable.

## Non-Goals

- Do not control the user's local game client, desktop windows, or local file system from the browser.
- Do not require users to install a local helper app.
- Do not recreate the WeChat Mini Program runtime exactly.
- Do not add real payment, shipping, SMS login, or production identity verification in the first release.
- Do not store real model keys, admin passwords, or other secrets in the repository.

## Product Shape

The root page is a product-style tool center with three primary cards:

- Delta Force Stats
- Gesture Beauty Cam
- Sanpingfang Milk Tea

Each card opens a dedicated tool page. The pages share a common shell with navigation, status messages, loading states, error states, and responsive layout.

The homepage project can later update its software links to point to these tool pages:

- `/tools/delta-force`
- `/tools/beauty-cam`
- `/tools/milk-tea`

## Architecture

### Frontend

Use `Vite + React` for the web application.

Responsibilities:

- Tool center landing page.
- Three tool pages.
- Shared layout, buttons, forms, cards, charts, modals, and empty states.
- API client wrappers.
- Responsive desktop and mobile views.
- Browser-only webcam experience for Beauty Cam.

### Backend

Use `Python + Flask` for the API server.

Responsibilities:

- Serve the production frontend build.
- Accept Delta Force screenshot uploads.
- Run screenshot recognition and return structured data.
- Manage milk tea shop products, orders, status changes, and admin access.
- Store lightweight data in SQLite.
- Enforce file size limits and reject unsupported uploads.

### Data

Use SQLite for the first release.

Primary tables:

- `milk_products`
- `milk_orders`
- `milk_order_items`
- `milk_shop_settings`
- `admin_sessions` or signed admin tokens

Delta Force uploads are temporary. Uploaded images should be deleted after recognition finishes or fails.

## Tool 1: Delta Force Stats

### User Flow

1. User opens `/tools/delta-force`.
2. User drags, pastes, or selects result screenshots.
3. Frontend previews selected images and validates file count/type/size.
4. User clicks analyze.
5. Backend runs recognition and parsing.
6. Frontend shows a structured profile.
7. User can copy a summary or export JSON.

### Core Output

The returned result should support:

- Nickname when recognized.
- Rank and rank stars when recognized.
- Overview and ranked KD values.
- Escape rate.
- Match count and play time.
- Carry value and related numeric fields when available.
- Radar values.
- Recent match list when available.
- Warnings for missing or low-confidence fields.

### Privacy Rules

- Do not keep uploaded screenshots after processing.
- Do not expose server file paths in API responses.
- Return understandable failure messages when recognition cannot parse the images.

### First Release Exclusions

- No local game automation.
- No automatic desktop screenshot capture.
- No player search automation.
- No permanent storage of uploaded screenshots.

## Tool 2: Gesture Beauty Cam

### User Flow

1. User opens `/tools/beauty-cam`.
2. Browser requests camera permission.
3. User sees live camera output on canvas.
4. User adjusts beauty sliders and filters.
5. Hand gestures trigger visual effects.
6. User can compare against the original view and toggle camera output.

### Core Features

- Skin smoothing.
- Brightening.
- Face slimming.
- Eye enlargement.
- Blush.
- Filter presets.
- Gesture-triggered particles or effects.
- Compare mode.
- Camera on/off control.

### Privacy Rules

- Camera frames stay in the browser.
- Do not upload video or images to the backend.
- Show a clear error if the browser blocks camera access.

### First Release Exclusions

- No server-side video processing.
- No account-based photo gallery.
- No automatic cloud save.

## Tool 3: Sanpingfang Milk Tea

### User Flow

1. User opens `/tools/milk-tea`.
2. User browses products by category.
3. User opens product details.
4. User customizes cup size, sweetness, ice level, toppings, and quantity.
5. User adds items to cart.
6. User submits an order.
7. User can view order status.

### Admin Flow

1. Maintainer opens `/admin/milk-tea`.
2. Maintainer enters the configured admin password.
3. Admin can create, edit, disable, and reorder products.
4. Admin can view orders and update order status.
5. Admin can view basic sales totals.

### Core Features

- Product category list.
- Product cards.
- Product detail view.
- Drink customization.
- Cart.
- Order creation.
- Order status list.
- Admin product management.
- Admin order management.
- Basic sales summary.

### First Release Exclusions

- No real payment.
- No delivery integration.
- No SMS, WeChat, or email login.
- No multi-store support.
- No customer identity verification beyond local order lookup.

## API Draft

Delta Force:

- `POST /api/delta-force/analyze`

Milk Tea public:

- `GET /api/milk-tea/products`
- `GET /api/milk-tea/products/:id`
- `POST /api/milk-tea/orders`
- `GET /api/milk-tea/orders/:lookupCode`

Milk Tea admin:

- `POST /api/admin/login`
- `GET /api/admin/milk-tea/products`
- `POST /api/admin/milk-tea/products`
- `PUT /api/admin/milk-tea/products/:id`
- `PATCH /api/admin/milk-tea/products/:id/status`
- `GET /api/admin/milk-tea/orders`
- `PATCH /api/admin/milk-tea/orders/:id/status`
- `GET /api/admin/milk-tea/summary`

## Project Structure

```text
pp-tools
|-- frontend
|   |-- src
|   |   |-- api
|   |   |-- components
|   |   |-- pages
|   |   `-- tools
|   |       |-- beauty-cam
|   |       |-- delta-force
|   |       `-- milk-tea
|   `-- package.json
|-- backend
|   |-- app.py
|   |-- routes
|   |-- services
|   |   |-- delta_ocr.py
|   |   `-- milk_tea_store.py
|   |-- data
|   `-- requirements.txt
|-- docs
|   `-- superpowers
|       `-- specs
`-- README.md
```

## Error Handling

- Frontend shows inline errors for failed requests, blocked camera permission, empty uploads, invalid files, and unavailable server responses.
- Backend returns JSON errors with stable `error` messages.
- Delta Force analysis returns partial results with warnings when possible instead of failing the entire request.
- Milk Tea order creation validates required customization and quantity fields.
- Admin endpoints return authorization errors without leaking internal details.

## Security And Operations

- Secrets must come from environment variables.
- Repository files must not contain real keys, tokens, or passwords.
- Admin password is configured outside source control.
- Uploaded files are limited by type, size, and count.
- Temporary uploads are deleted after processing.
- SQLite data should be easy to back up before deployment changes.

## Testing

Frontend tests:

- Tool center renders all three tools.
- Delta Force upload page handles empty, invalid, and valid selections.
- Beauty Cam page renders controls and handles permission error state.
- Milk Tea page supports product list, customization, cart, and order submit states.

Backend tests:

- Delta Force analyze endpoint rejects missing files and invalid file types.
- Delta Force analyze endpoint returns structured JSON for a known sample or mocked recognizer.
- Milk Tea product APIs return active products.
- Milk Tea order API creates an order and returns a lookup code.
- Admin endpoints reject unauthenticated requests.
- Admin endpoints update product and order status after login.

Browser verification:

- Open the product center.
- Open each tool page.
- Complete a milk tea order flow.
- Update the order status in admin.
- Load Beauty Cam and verify camera permission handling.
- Upload a Delta Force sample image and verify result or failure state.

## Deployment Plan

First run everything locally:

- Frontend development server.
- Flask API server.
- SQLite database file.

For production, use a platform that can run a Python web service with the required recognition dependencies. The frontend build can be served by the Flask server or by a static host that calls the API server.

Before production launch:

- Configure environment variables.
- Set upload limits.
- Add a privacy notice for uploaded screenshots and webcam behavior.
- Back up SQLite data.
- Verify admin access cannot be reached without authorization.

## Future Upgrade Path

After the online tool suite is stable, add a second product layer:

- LLM-powered website and content optimization assistant.
- Task based workflow files for repeatable improvement runs.
- Structured run reports that record inputs, tool calls, outputs, checks, and review status.
- Human-approved change application instead of automatic source edits.

This keeps the first release focused on usable online tools while leaving a clear path toward a mature LLM + intelligent workflow product.

## Acceptance Criteria

- A new `pp-tools` project has a reviewed design and implementation plan.
- The first implementation can run locally with frontend and backend.
- All three tool pages are reachable from the product center.
- Delta Force accepts screenshots and returns either structured results or a clear failure state.
- Beauty Cam runs without uploading camera frames.
- Milk Tea supports product browsing, cart, order creation, and admin order status updates.
- The personal homepage can link to the tool pages without merging the two projects.
- No repository file contains real secrets or provider/tooling signatures.
