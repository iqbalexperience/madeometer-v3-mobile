# Madeometer API Reference

Base path: `/api/madeometer`

All requests and responses use **JSON**. Error responses always have the shape `{ "error": "..." }`.

---

## Gemini (AI)

### `POST /api/madeometer/gemini/analyze`

Analyzes a product image or text query using Gemini AI.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `"IMAGE" \| "TEXT"` | ✅ | Input mode |
| `data` | `string` | ✅ | Base64 image data or product name/query |
| `preferences` | `Preference[]` | — | User ethical preferences |
| `model` | `string` | — | Default: `"madeometer-instant"` |
| `language` | `string` | — | Default: `"en"` |
| `location` | `{ lat: number, lng: number }` | — | User location for context |

**Response**

```json
{ "results": ScanResult[] }
```

---

### `POST /api/madeometer/gemini/alternatives`

Finds ethical/local product alternatives via Gemini + Google Search. Results are cached per `scanId`.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `itemName` | `string` | ✅ | Product name to find alternatives for |
| `location` | `{ lat: number, lng: number }` | — | User location |
| `preferences` | `Preference[]` | — | User ethical preferences |
| `language` | `string` | — | Default: `"en"` |
| `currency` | `string` | — | Override currency |
| `country` | `string` | — | Override country |
| `scanId` | `string` | — | Used as cache key |
| `userId` | `string` | — | Used for cache scoping |
| `isRefresh` | `boolean` | — | `true` to bypass cache. Default: `false` |

**Response**

```json
{ "alternatives": Alternative[] }
```

---

### `POST /api/madeometer/gemini/shopping`

Finds purchasing links and prices for a product via Gemini + Google Search. Results are cached per `scanId`.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `itemName` | `string` | ✅ | Product name to find shopping options for |
| `location` | `{ lat: number, lng: number }` | — | User location |
| `language` | `string` | — | Default: `"en"` |
| `currency` | `string` | — | Override currency |
| `country` | `string` | — | Override country |
| `scanId` | `string` | — | Used as cache key |
| `userId` | `string` | — | Used for cache scoping |
| `isRefresh` | `boolean` | — | `true` to bypass cache. Default: `false` |

**Response**

```json
{ "shoppingOptions": ShoppingOption[] }
```

---

### `POST /api/madeometer/gemini/chat`

Unified stateless chat endpoint. Supports two actions.

#### Action: `"init"`

Initializes a chat session by preparing context from scan data.

**Request body**

| Field | Type | Required |
|---|---|---|
| `action` | `"init"` | ✅ |
| `data` | `ScanResult \| ScanResult[]` | ✅ |
| `model` | `string` | — |
| `location` | `{ lat: number, lng: number }` | — |

**Response**

```json
{ "context": "string", "model": "string", "location": {} }
```

#### Action: `"send"`

Sends a message in an existing chat session. Pass the full conversation history on every call (stateless).

**Request body**

| Field | Type | Required |
|---|---|---|
| `action` | `"send"` | ✅ |
| `message` | `string` | ✅ |
| `context` | `string` | ✅ |
| `history` | `{ role: "user" \| "model"; content: string }[]` | — |
| `location` | `{ lat: number, lng: number }` | — |

**Response**

```json
{ "text": "string", "grounding": [] }
```

---

### `POST /api/madeometer/gemini/translate`

Two modes for translation.

**Mode 1 — Scan translation** (provide `scanId` + `targetLang`):

| Field | Type | Required |
|---|---|---|
| `scanId` | `string` | ✅ |
| `targetLang` | `string` | ✅ (e.g. `"de"`, `"fr"`) |

**Response**: `{ "translations": { [lang]: { itemName, description, ... } } }`

**Mode 2 — UI text translation** (provide `text` only):

| Field | Type | Required |
|---|---|---|
| `text` | `string` | ✅ |

**Response**: `{ "translations": { "da": "...", "de": "...", ... } }`

---

### `POST /api/madeometer/gemini/unsplash`

Fetches a relevant product image from Unsplash.

**Request body**

| Field | Type | Required |
|---|---|---|
| `query` | `string` | ✅ (e.g. `"Coca-Cola bottle"`) |

**Response**

```json
{ "imageUrl": "string | null" }
```

---

## Database

### Scans

#### `GET /api/madeometer/db/scans`

Returns the full scan history.

**Query parameters**

| Param | Description |
|---|---|
| `userId` | Filter by user ID |

**Response**: `{ "scans": ScanResult[] }`

#### `POST /api/madeometer/db/scans`

Saves a new scan (upsert). Also updates related brand, product, and alternative tables.

**Request body**: `{ "result": ScanResult }` — `result.id` is required.

**Response**: `{ "success": true }`

#### `PUT /api/madeometer/db/scans`

Updates the verdict and description on an existing scan.

**Request body**: `{ "result": ScanResult }` — `result.id` is required.

**Response**: `{ "success": true }`

#### `DELETE /api/madeometer/db/scans`

- With `{ "id": "string" }` — deletes a specific scan.
- With `{}` — clears **all** scans (admin use).

**Response**: `{ "success": true }`

---

#### `GET /api/madeometer/db/scans/search`

Searches the local scan cache for a product by name. Only returns high-confidence or manually validated results within a 90-day TTL.

**Query parameters**

| Param | Required | Description |
|---|---|---|
| `query` | ✅ | Product name to search |

**Response**: `{ "result": ScanResult | null }`

---

#### `GET /api/madeometer/db/scans/image`

Returns a stored product or brand image URL. Checks the product table first, then the brand table.

**Query parameters**

| Param | Required |
|---|---|
| `product` | ✅ |
| `brand` | ✅ |

**Response**: `{ "imageUrl": "string | undefined" }`

---

### Brands

#### `GET /api/madeometer/db/brands`

Returns all brands.

**Query parameters** (optional — for paginated mode)

| Param | Description | Default |
|---|---|---|
| `paginated` | Set to `"true"` to enable pagination | — |
| `page` | Page number | `1` |
| `pageSize` | Items per page | `20` |
| `sortField` | Field to sort by | `"name"` |
| `sortOrder` | `"asc"` or `"desc"` | `"asc"` |
| `search` | Name search filter | — |
| `originCountry` | Filter by country | — |

**Response (flat)**: `{ "brands": Brand[] }`

**Response (paginated)**: `{ "data": Brand[], "total": number, "page": number, "pageSize": number }`

#### `PUT /api/madeometer/db/brands`

Upserts a brand record.

**Request body**: `{ "name": "string", ...brand }` — `name` is required.

#### `DELETE /api/madeometer/db/brands`

Deletes a brand by name.

**Request body**: `{ "name": "string" }`

---

### Products

#### `GET /api/madeometer/db/products`

Returns all products.

**Response**: `{ "products": Product[] }`

#### `PUT /api/madeometer/db/products`

Upserts a product record.

**Request body**: `{ "name": "string", ...product }` — `name` is required.

#### `DELETE /api/madeometer/db/products`

Deletes a product by name.

**Request body**: `{ "name": "string" }`

---

### Global Preferences _(Admin only)_

#### `GET /api/madeometer/db/preferences`

Returns all global preferences.

**Query parameters** (optional — for paginated mode)

| Param | Description | Default |
|---|---|---|
| `paginated` | Set to `"true"` to enable pagination | — |
| `page` | Page number | `1` |
| `pageSize` | Items per page | `20` |
| `sortField` | Field to sort by | `"label"` |
| `sortOrder` | `"asc"` or `"desc"` | `"asc"` |
| `search` | Label search filter | — |
| `category` | Category filter | — |

**Response (flat)**: `{ "preferences": Preference[] }`

#### `PUT /api/madeometer/db/preferences`

Saves multiple global preferences at once.

**Request body**: `{ "prefs": Preference[] }`

#### `PATCH /api/madeometer/db/preferences`

Saves a single global preference.

**Request body**: `{ "id": "string", "label": "string", ...Preference }` — `id` and `label` required.

#### `DELETE /api/madeometer/db/preferences/[id]`

Deletes a global preference by ID.

**Path parameter**: `id`

---

### User Preferences

#### `GET /api/madeometer/db/user-preferences`

Returns merged preferences for a user (global defaults + user overrides + user-created). Returns `undefined` if no `userId` is provided.

**Query parameters**

| Param | Description |
|---|---|
| `userId` | User ID |

**Response**: `{ "preferences": Preference[] | undefined }`

#### `POST /api/madeometer/db/user-preferences`

Saves user preference overrides. Only differences from global defaults are persisted.

**Request body**

| Field | Type | Required |
|---|---|---|
| `prefs` | `Preference[]` | ✅ |
| `userId` | `string` | — |

---

### User Settings

#### `GET /api/madeometer/db/user-settings`

Returns a user's language, currency, and shopping country settings.

**Query parameters**

| Param | Required |
|---|---|
| `userId` | ✅ |

**Response**: `{ "language": "string", "currency": "string", "shoppingCountry": "string" }`

#### `PUT /api/madeometer/db/user-settings`

Updates user settings.

**Request body**

| Field | Type | Required |
|---|---|---|
| `userId` | `string` | ✅ |
| `settings` | `{ language?: string, currency?: string, shoppingCountry?: string }` | ✅ |

---

### Users _(Admin only)_

#### `GET /api/madeometer/db/users`

Returns all users as `UserProfile[]`. Requires an active admin session.

**Response**: `{ "users": UserProfile[] }`

---

### Blacklist

#### `GET /api/madeometer/db/blacklist`

Returns all blacklisted brands/products.

**Query parameters**

| Param | Description |
|---|---|
| `check` | If provided, returns `{ "blacklisted": boolean }` for that name only |

**Response (full list)**: `{ "items": { id, name, type, timestamp }[] }`

#### `POST /api/madeometer/db/blacklist`

Adds a brand or product to the blacklist.

**Request body**

| Field | Type | Required |
|---|---|---|
| `name` | `string` | ✅ |
| `type` | `"BRAND" \| "PRODUCT"` | ✅ |

#### `DELETE /api/madeometer/db/blacklist`

Removes an item from the blacklist.

**Request body**: `{ "name": "string" }`

---

### Whitelist

#### `GET /api/madeometer/db/whitelist`

Returns all whitelisted brands/products.

**Query parameters**

| Param | Description |
|---|---|
| `check` | If provided, returns `{ "whitelisted": boolean }` for that name only |

**Response (full list)**: `{ "items": WhitelistItem[] }`

#### `POST /api/madeometer/db/whitelist`

Adds a brand or product to the whitelist.

**Request body**

| Field | Type | Required |
|---|---|---|
| `name` | `string` | ✅ |
| `type` | `"BRAND" \| "PRODUCT"` | ✅ |

#### `DELETE /api/madeometer/db/whitelist`

Removes an item from the whitelist.

**Request body**: `{ "name": "string" }`

---

### List Check

#### `POST /api/madeometer/db/list-check`

Checks multiple names against both the whitelist and blacklist simultaneously.

**Request body**

| Field | Type | Required |
|---|---|---|
| `names` | `string[]` | ✅ |

**Response**: `{ "whitelisted": boolean, "blacklisted": boolean }`

---

### Translations

#### `GET /api/madeometer/db/translations`

Returns all UI translation keys and their language-value maps.

**Response**: `{ "translations": Translation[] }`

#### `POST /api/madeometer/db/translations`

Upserts a translation record.

**Request body**

| Field | Type | Required |
|---|---|---|
| `key` | `string` | ✅ |
| `values` | `Record<string, string>` | ✅ |

#### `DELETE /api/madeometer/db/translations`

Deletes a translation record by key.

**Request body**: `{ "key": "string" }`

---

### Feedback

#### `POST /api/madeometer/db/feedback`

Submits user feedback (triggers SendGrid email + saves to DB).

**Request body**

| Field | Type | Required |
|---|---|---|
| `text` | `string` | ✅ |
| `email` | `string` | — |
| `source` | `string` | — |
| `images` | `string[]` | — |

**Response**: `{ "success": true }`

---

### Seed _(Admin only)_

#### `POST /api/madeometer/db/seed`

Seeds default global preferences and UI translations into the database. Safe to call multiple times — only fills missing records. Requires an active admin session.

**Response**: `{ "success": true }`

---

## Common Response Codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request — missing or invalid fields |
| `403` | Unauthorized — admin session required |
| `500` | Internal server error |
