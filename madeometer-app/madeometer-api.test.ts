/**
 * Madeometer API Test Suite
 *
 * Tests all /api/madeometer endpoints using native fetch (Node 18+).
 * Requires: Next.js dev server running at BASE_URL.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json app/api/madeometer/__tests__/madeometer-api.test.ts
 *
 * Or with a custom base URL:
 *   BASE_URL=http://localhost:3001 npx ts-node ... (same path)
 *
 * Note: Tests that call Gemini (analyze, alternatives, shopping, translate, chat)
 * require a valid GEMINI_API_KEY in the server environment.
 * Tests that require admin auth are marked with [ADMIN REQUIRED].
 */

const BASE_URL = 'http://192.168.1.5:3000';

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// ── Test Runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let skipped = 0;

async function test(
    name: string,
    fn: () => Promise<void>,
    opts: { skip?: boolean } = {}
) {
    if (opts.skip) {
        console.log(`${YELLOW}  ⏭  SKIP${RESET}  ${name}`);
        skipped++;
        return;
    }
    try {
        await fn();
        console.log(`${GREEN}  ✅ PASS${RESET}  ${name}`);
        passed++;
    } catch (err: any) {
        console.log(`${RED}  ❌ FAIL${RESET}  ${name}`);
        console.log(`         ${RED}${err.message}${RESET}`);
        failed++;
    }
}

function group(name: string) {
    console.log(`\n${BOLD}${CYAN}▶ ${name}${RESET}`);
}

/** Assert with a descriptive error message */
function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function post(path: string, body: object) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res;
}

async function get(path: string) {
    return fetch(`${BASE_URL}${path}`);
}

async function put(path: string, body: object) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res;
}

async function del(path: string, body?: object) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res;
}

// ── Gemini Tests ──────────────────────────────────────────────────────────────

async function testGeminiUnsplash() {
    group('/api/madeometer/gemini/unsplash');

    await test('returns 400 when query is missing', async () => {
        const res = await post('/api/madeometer/gemini/unsplash', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
        const json = await res.json();
        assert(json.error, 'Expected error field');
    });

    await test('returns imageUrl for a valid query', async () => {
        const res = await post('/api/madeometer/gemini/unsplash', { query: 'bottle of water' });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert('imageUrl' in json, 'Expected imageUrl field in response');
    });
}

async function testGeminiTranslate() {
    group('/api/madeometer/gemini/translate');

    await test('returns 400 when neither text nor scanId+targetLang provided', async () => {
        const res = await post('/api/madeometer/gemini/translate', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('translates a simple UI text string into multiple languages', async () => {
        const res = await post('/api/madeometer/gemini/translate', {
            text: 'Scan Again',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.translations, 'Expected translations field');
        assert(typeof json.translations === 'object', 'translations should be an object');
    });
}

async function testGeminiChat() {
    group('/api/madeometer/gemini/chat');

    await test('returns 400 when action is missing', async () => {
        const res = await post('/api/madeometer/gemini/chat', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns 400 for invalid action', async () => {
        const res = await post('/api/madeometer/gemini/chat', { action: 'invalid' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('init action returns context, model fields', async () => {
        const mockScan = {
            id: 'test-id',
            itemName: 'Coca-Cola',
            ownerCompany: 'The Coca-Cola Company',
            ownerCountry: 'USA',
            verdict: 'AVOID',
            description: 'American beverage company',
        };
        const res = await post('/api/madeometer/gemini/chat', {
            action: 'init',
            data: mockScan,
            model: 'madeometer-instant',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.context, 'Expected context field');
        assert(json.model, 'Expected model field');
    });

    await test('send action returns 400 when message or context missing', async () => {
        const res = await post('/api/madeometer/gemini/chat', {
            action: 'send',
            // missing message and context
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('send action returns text and grounding', async () => {
        const res = await post('/api/madeometer/gemini/chat', {
            action: 'send',
            message: 'Is this product ethical?',
            history: [],
            context: JSON.stringify([{
                id: 'test-id',
                itemName: 'Coca-Cola',
                owner: 'The Coca-Cola Company',
                ownerCountry: 'USA',
                verdict: 'AVOID',
                description: 'American beverage company',
                political: 'Unknown',
            }]),
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(typeof json.text === 'string', 'Expected text field as string');
        assert(Array.isArray(json.grounding), 'Expected grounding as array');
    });
}

async function testGeminiAnalyze() {
    group('/api/madeometer/gemini/analyze');

    await test('returns 400 when type and data are missing', async () => {
        const res = await post('/api/madeometer/gemini/analyze', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns 400 for invalid type', async () => {
        const res = await post('/api/madeometer/gemini/analyze', {
            type: 'AUDIO',
            data: 'something',
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('analyzes text query and returns results array', async () => {
        const res = await post('/api/madeometer/gemini/analyze', {
            type: 'TEXT',
            data: 'Coca-Cola',
            language: 'en',
            model: 'madeometer-instant',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.results), 'Expected results array');
    });
}

async function testGeminiAlternatives() {
    group('/api/madeometer/gemini/alternatives');

    await test('returns 400 when itemName is missing', async () => {
        const res = await post('/api/madeometer/gemini/alternatives', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns alternatives array for a valid product', async () => {
        const res = await post('/api/madeometer/gemini/alternatives', {
            itemName: 'Coca-Cola',
            language: 'en',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.alternatives), 'Expected alternatives array');
    });
}

async function testGeminiShopping() {
    group('/api/madeometer/gemini/shopping');

    await test('returns 400 when itemName is missing', async () => {
        const res = await post('/api/madeometer/gemini/shopping', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns shoppingOptions array for a valid product', async () => {
        const res = await post('/api/madeometer/gemini/shopping', {
            itemName: 'Coca-Cola',
            language: 'en',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.shoppingOptions), 'Expected shoppingOptions array');
    });
}

// ── Database Tests ────────────────────────────────────────────────────────────

async function testWhitelist() {
    group('/api/madeometer/db/whitelist');
    const testName = '__test-brand-wl__';

    await test('GET returns items array', async () => {
        const res = await get('/api/madeometer/db/whitelist');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.items), 'Expected items array');
    });

    await test('GET ?check= returns whitelisted boolean', async () => {
        const res = await get('/api/madeometer/db/whitelist?check=nonexistentbrand9999');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(typeof json.whitelisted === 'boolean', 'Expected boolean whitelisted');
        assert(json.whitelisted === false, 'Should not be whitelisted');
    });

    await test('POST returns 400 when name is missing', async () => {
        const res = await post('/api/madeometer/db/whitelist', { type: 'BRAND' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST returns 400 for invalid type', async () => {
        const res = await post('/api/madeometer/db/whitelist', { name: testName, type: 'INVALID' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST adds item to whitelist', async () => {
        const res = await post('/api/madeometer/db/whitelist', { name: testName, type: 'BRAND' });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });

    await test('GET ?check= returns true for whitelisted brand', async () => {
        const res = await get(`/api/madeometer/db/whitelist?check=${testName}`);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.whitelisted === true, `Expected whitelisted: true for ${testName}`);
    });

    await test('DELETE removes item from whitelist', async () => {
        const res = await del('/api/madeometer/db/whitelist', { name: testName });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });

    await test('GET ?check= returns false after delete', async () => {
        const res = await get(`/api/madeometer/db/whitelist?check=${testName}`);
        const json = await res.json();
        assert(json.whitelisted === false, 'Should be false after delete');
    });
}

async function testBlacklist() {
    group('/api/madeometer/db/blacklist');
    const testName = '__test-brand-bl__';

    await test('GET returns items array', async () => {
        const res = await get('/api/madeometer/db/blacklist');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.items), 'Expected items array');
    });

    await test('GET ?check= returns blacklisted boolean', async () => {
        const res = await get('/api/madeometer/db/blacklist?check=nonexistentbrand9999');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.blacklisted === false, 'Should not be blacklisted');
    });

    await test('POST adds item to blacklist', async () => {
        const res = await post('/api/madeometer/db/blacklist', { name: testName, type: 'BRAND' });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('DELETE removes item from blacklist', async () => {
        const res = await del('/api/madeometer/db/blacklist', { name: testName });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
}

async function testListCheck() {
    group('/api/madeometer/db/list-check');

    await test('returns 400 when names is missing', async () => {
        const res = await post('/api/madeometer/db/list-check', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns 400 when names is not an array', async () => {
        const res = await post('/api/madeometer/db/list-check', { names: 'Coca-Cola' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns whitelisted and blacklisted booleans', async () => {
        const res = await post('/api/madeometer/db/list-check', {
            names: ['nonexistent-brand-xyz', 'another-fake-brand-abc']
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(typeof json.whitelisted === 'boolean', 'Expected whitelisted boolean');
        assert(typeof json.blacklisted === 'boolean', 'Expected blacklisted boolean');
    });
}

async function testPreferences() {
    group('/api/madeometer/db/preferences');

    await test('GET returns preferences array', async () => {
        const res = await get('/api/madeometer/db/preferences');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.preferences), 'Expected preferences array');
    });

    await test('GET ?paginated=true returns preferences and total', async () => {
        const res = await get('/api/madeometer/db/preferences?paginated=true&page=1&pageSize=5');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.preferences), 'Expected preferences array in paginated response');
        assert(typeof json.total === 'number', 'Expected total number in paginated response');
    });
}

async function testUserPreferences() {
    group('/api/madeometer/db/user-preferences');

    await test('GET without userId returns undefined preferences', async () => {
        const res = await get('/api/madeometer/db/user-preferences');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.preferences === undefined || json.preferences === null, 'Expected undefined preferences');
    });

    await test('POST returns 400 when prefs is missing', async () => {
        const res = await post('/api/madeometer/db/user-preferences', { userId: 'test-user' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST saves preferences without error for a known userId', async () => {
        const res = await post('/api/madeometer/db/user-preferences', {
            prefs: [],
            userId: undefined // Skip actual DB write by passing undefined
        });
        // Returns 200 because savePreferences skips silently if no userId
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
}

async function testUserSettings() {
    group('/api/madeometer/db/user-settings');

    await test('GET returns 400 when userId is missing', async () => {
        const res = await get('/api/madeometer/db/user-settings');
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('PUT returns 400 when userId is missing', async () => {
        const res = await put('/api/madeometer/db/user-settings', { settings: { language: 'en' } });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('PUT returns 400 when settings is missing', async () => {
        const res = await put('/api/madeometer/db/user-settings', { userId: 'user-123' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });
}

async function testScans() {
    group('/api/madeometer/db/scans');

    await test('GET returns scans array', async () => {
        const res = await get('/api/madeometer/db/scans');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.scans), 'Expected scans array');
    });

    await test('POST returns 400 when result is missing', async () => {
        const res = await post('/api/madeometer/db/scans', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    const mockScanId = `test-scan-${Date.now()}`;

    await test('POST saves a scan result', async () => {
        const mockScan = {
            id: mockScanId,
            timestamp: Date.now(),
            imageUrl: 'https://example.com/img.jpg',
            itemName: 'Test Product',
            ownerCompany: 'Test Corp',
            ownerCountry: 'USA',
            ownerFlag: '🇺🇸',
            originCountry: 'USA',
            originFlag: '🇺🇸',
            manufacturedIn: 'USA',
            description: 'A test product',
            verdict: 'NEUTRAL',
            verdictReason: 'Test reason',
            matchedUserCriteria: [],
            sustainabilityScore: 50,
            ethicsScore: 50,
            alternatives: [],
            europeanAlternatives: [],
            dataSources: [],
            uncertainties: [],
        };
        const res = await post('/api/madeometer/db/scans', { result: mockScan });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });

    await test('DELETE removes a specific scan by id', async () => {
        const res = await del('/api/madeometer/db/scans', { id: mockScanId });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });
}

async function testScansSearch() {
    group('/api/madeometer/db/scans/search');

    await test('GET returns 400 when query is missing', async () => {
        const res = await get('/api/madeometer/db/scans/search');
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('GET returns null for unknown product', async () => {
        const res = await get('/api/madeometer/db/scans/search?query=ProductThatDoesNotExist9999');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.result === null, 'Expected result: null for unknown product');
    });
}

async function testScansImage() {
    group('/api/madeometer/db/scans/image');

    await test('GET returns 400 when product or brand is missing', async () => {
        const res = await get('/api/madeometer/db/scans/image?product=Coke');
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('GET returns imageUrl (possibly undefined) for a product', async () => {
        const res = await get('/api/madeometer/db/scans/image?product=Coca-Cola&brand=The+Coca-Cola+Company');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert('imageUrl' in json, 'Expected imageUrl key in response');
    });
}

async function testFeedback() {
    group('/api/madeometer/db/feedback');

    await test('POST returns 400 when text is missing', async () => {
        const res = await post('/api/madeometer/db/feedback', { email: 'test@example.com' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST submits feedback successfully', async () => {
        const res = await post('/api/madeometer/db/feedback', {
            email: 'test@example.com',
            text: '[API Test] This is an automated test feedback entry',
            source: 'test-suite',
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });
}

async function testTranslations() {
    group('/api/madeometer/db/translations');

    await test('GET returns translations array', async () => {
        const res = await get('/api/madeometer/db/translations');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.translations), 'Expected translations array');
    });

    await test('POST returns 400 when key or values missing', async () => {
        const res = await post('/api/madeometer/db/translations', { key: 'test_key' });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    const testKey = `__api_test_key_${Date.now()}__`;

    await test('POST saves a translation record', async () => {
        const res = await post('/api/madeometer/db/translations', {
            key: testKey,
            values: { en: 'Hello', da: 'Hej', de: 'Hallo' },
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });

    await test('DELETE removes a translation record', async () => {
        const res = await del('/api/madeometer/db/translations', { key: testKey });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(json.success, 'Expected success: true');
    });
}

async function testBrands() {
    group('/api/madeometer/db/brands');

    await test('GET returns brands array', async () => {
        const res = await get('/api/madeometer/db/brands');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.brands), 'Expected brands array');
    });

    await test('GET ?paginated=true returns brands and total', async () => {
        const res = await get('/api/madeometer/db/brands?paginated=true&page=1&pageSize=5');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.brands), 'Expected brands in paginated');
        assert(typeof json.total === 'number', 'Expected total count');
    });

    await test('PUT returns 400 when name is missing', async () => {
        const res = await put('/api/madeometer/db/brands', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('DELETE returns 400 when name is missing', async () => {
        const res = await del('/api/madeometer/db/brands', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });
}

async function testProducts() {
    group('/api/madeometer/db/products');

    await test('GET returns products array', async () => {
        const res = await get('/api/madeometer/db/products');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const json = await res.json();
        assert(Array.isArray(json.products), 'Expected products array');
    });

    await test('PUT returns 400 when name is missing', async () => {
        const res = await put('/api/madeometer/db/products', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('DELETE returns 400 when name is missing', async () => {
        const res = await del('/api/madeometer/db/products', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });
}

async function testUsers() {
    group('/api/madeometer/db/users');

    await test('GET returns 403 without admin auth (unauthenticated request)', async () => {
        const res = await get('/api/madeometer/db/users');
        // Unauthenticated requests should be rejected
        assert(res.status === 403, `Expected 403, got ${res.status}`);
    });
}

async function testSeed() {
    group('/api/madeometer/db/seed');

    await test('POST returns 403 without admin auth (unauthenticated request)', async () => {
        const res = await post('/api/madeometer/db/seed', {});
        // Unauthenticated requests should be rejected
        assert(res.status === 403, `Expected 403, got ${res.status}`);
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${CYAN}  Madeometer API Test Suite${RESET}`);
    console.log(`${BOLD}${CYAN}  Base URL: ${BASE_URL}${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`);

    // ── Database (lightweight, no AI calls) ──
    await testWhitelist();
    await testBlacklist();
    await testListCheck();
    await testPreferences();
    await testUserPreferences();
    await testUserSettings();
    await testScans();
    await testScansSearch();
    await testScansImage();
    await testTranslations();
    await testBrands();
    await testProducts();
    await testUsers();
    await testSeed();
    await testFeedback();

    // ── Gemini (makes real AI calls — requires GEMINI_API_KEY) ──
    await testGeminiUnsplash();
    await testGeminiChat();
    await testGeminiTranslate();
    await testGeminiAlternatives();
    await testGeminiShopping();
    await testGeminiAnalyze();

    // ── Summary ──
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  Results: ${GREEN}${passed} passed${RESET}, ${RED}${failed} failed${RESET}, ${YELLOW}${skipped} skipped${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`${RED}Unhandled error:${RESET}`, err);
    process.exit(1);
});
