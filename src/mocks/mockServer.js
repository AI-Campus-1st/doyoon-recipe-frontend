// 개발용 가짜 API 서버 (npm run dev:mock 전용)
// - 역할: 백엔드가 아직 없을 때 화면 흐름을 눈으로 확인하기 위해 httpClient의 transport(fetch 대체)로 끼운다.
// - FUNCTIONS.md의 API 경로·상태 코드·응답 필드 계약을 흉내 낸다. 실제 서버 규칙(동의어·기본 기한 사전 등)을 완전히 구현하지 않는다.
// - 데이터는 이 브라우저 localStorage에만 저장된다. 비밀번호도 평문으로 저장되므로 실제 비밀번호를 입력하지 말 것.
// - 실패 상황 확인용 스위치: localStorage['mock.fail'] = 'rescue' | 'ingredients' | 'one-touch' | 'recommendations' | 'recipe' | 'cook' | 'create' | 'seasonings' | 'search'
//   → 해당 요청이 500을 돌려준다(개발 도구 콘솔에서 설정).
import { setTransport } from '../shared/api/httpClient.js';
// 목업 데이터는 src/api/mock/에 모아 두고, 이 파일은 '요청 → 응답' 흉내(라우팅·저장·정렬)만 맡는다.
import { INITIAL_INVENTORY, ONE_TOUCH, RECIPES, SEASONING_LIST, MOCK_SEASONINGS } from '../api/mock/index.js';

const DB_KEY = 'mock.db';
const LATENCY_MS = 450;

// Asia/Seoul 기준 오늘 날짜(YYYY-MM-DD) — '서버'가 계산하는 값을 흉내 낸다
function seoulToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function diffDays(iso, base) {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / 86400000);
}
function statusOf(dDay) {
  if (dDay < 0) return 'expired';
  if (dDay <= 2) return 'urgent';
  if (dDay <= 5) return 'warning';
  return 'ok';
}

function loadDb() {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 무시 */
  }
  return { users: {}, inventories: {}, nextId: 1, history: [] };
}
function saveDb(db) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* 무시 */
  }
}
function failSwitch() {
  try {
    return window.localStorage.getItem('mock.fail');
  } catch {
    return null;
  }
}

const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const fail = (status, code, message) => json(status, { error: { code, message } });

function view(item, today) {
  const d_day = diffDays(item.expiry_date, today);
  return { id: item.id, name: item.name, storage: 'fridge', expiry_date: item.expiry_date, d_day, status: statusOf(d_day) };
}

function seedInventory(db, username) {
  const today = seoulToday();
  db.inventories[username] = INITIAL_INVENTORY.map(({ name, offset }) => ({
    id: db.nextId++,
    name,
    expiry_date: addDays(today, offset),
  }));
}

// 아주 단순화한 추천: 정확한 이름 일치만, 양념·밥은 보유로 간주, 만료 재고 제외
// seed = `사용자id:서울날짜` — 동점·무작위 순서를 사람마다 하루 한 번 바꾼다(서버 recommend.js와 같은 규칙, 2026-10-19)
function evaluateAll(inventory, today, seed) {
  const usable = inventory.map((i) => view(i, today)).filter((i) => i.status !== 'expired');
  const best = new Map();
  for (const item of usable) {
    const prev = best.get(item.name);
    if (!prev || item.d_day < prev.d_day) best.set(item.name, item);
  }
  const weight = (d) => (d === 0 ? 3 : d <= 2 ? 2 : d <= 5 ? 1 : 0);
  const evaluated = RECIPES.map((r) => {
    // 주재료는 종류(이름) 기준 — 같은 이름 두 줄은 1개(사용자 결정 2026-10-19). 가중치는 레시피 주재료의 연결 재고에만.
    const mains = [...new Map(r.ingredients.filter((i) => !i.is_seasoning).map((i) => [i.name, i])).values()];
    const missing = mains.filter((i) => i.name !== '밥' && !best.has(i.name)).map((i) => i.name);
    const urgentUsed = mains.filter((i) => best.get(i.name)?.status === 'urgent').map((i) => i.name);
    const owned = mains.length - missing.length;
    const score = mains.reduce((s, i) => s + weight(best.get(i.name)?.d_day ?? 99), 0) + owned / mains.length - missing.length;
    // 내 재고를 실제로 쓰는지(기본 양념·가상 밥만으로 맞는 레시피는 false → 맨 뒤)
    const usesStock = mains.some((i) => best.has(i.name));
    return {
      id: r.id, title: r.title, cook_time_min: r.cook_time_min, score, urgent_used: urgentUsed, missing,
      usesStock, tieKey: tieBreakKey(seed, r.id), keyMenu: Boolean(r.key_menu), mainCount: mains.length,
    };
  });
  return evaluated;
}

// 응답 score는 소수 둘째 자리 반올림, 내부 정렬 필드는 응답에서 뺀다
// substitutes: 목업은 동의어(includes)가 없어 대체가 생기지 않으므로 늘 [] — 응답 모양만 서버와 맞춘다(2026-10-20)
const toResponse = ({ usesStock, tieKey, keyMenu, mainCount, ...r }) => ({ ...r, score: Math.round(r.score * 100) / 100, substitutes: [] });

// 무작위로 count개 고르기(원래 순서 유지) — 서버 domain/recommend.js pickRandom과 같은 방식
function pickRandom(list, count) {
  const idx = list.map((_, i) => i);
  const n = Math.min(count, idx.length);
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(Math.random() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).sort((a, b) => a - b).map((i) => list[i]);
}

// 2026-10-20 사용자 결정(서버와 같은 규칙): 부족 2개 이하만 → 순위 상위 pool개 중 limit개 무작위.
// 후보가 없으면 대표 메뉴(key_menu)에서만 무작위. 부를 때마다 결과가 달라진다.
function recommend(inventory, today, seed = '', { excludeIds = new Set(), limit = RECOMMENDATION_MAX, pool = limit } = {}) {
  const evaluated = evaluateAll(inventory, today, seed).filter((r) => !excludeIds.has(r.id));
  const candidates = evaluated.filter((r) => r.missing.length < 3).sort(compareRecommendations); // 정렬은 반올림 전 점수로
  if (candidates.length) return pickRandom(candidates.slice(0, pool), limit).map(toResponse);
  const keyMenus = evaluated.filter((r) => r.keyMenu);
  return pickRandom(keyMenus, limit).map(toResponse);
}

// 대표 메뉴 영역(서버 recommend.js selectKeyMenus와 같은 규칙, 2026-10-19): key_menu 레시피 중 만들기 쉬운 3개
// 부족 적은 순 → 조리시간 짧은 순 → 주재료 적은 순 → tieKey → id. 부족이 많아도 빼지 않는다.
export function compareKeyMenus(a, b) {
  return (
    a.missing.length - b.missing.length ||
    a.cook_time_min - b.cook_time_min ||
    a.mainCount - b.mainCount ||
    (a.tieKey ?? 0) - (b.tieKey ?? 0) ||
    a.id - b.id
  );
}
const KEY_MENU_MAX = 3;

function recommendationPage(inventory, today, seed) {
  const ranked = evaluateAll(inventory, today, seed).filter((r) => r.keyMenu).sort(compareKeyMenus);
  const keyMenus = pickRandom(ranked.slice(0, 9), KEY_MENU_MAX); // 만들기 쉬운 상위 9개 중 3개(서버와 같은 값)
  const excludeIds = new Set(keyMenus.map((r) => r.id));
  return {
    key_menus: keyMenus.map(toResponse),
    recipes: recommend(inventory, today, seed, { excludeIds, limit: RECOMMENDATION_MAX, pool: 15 }),
  };
}

// 서버 src/domain/recommend.js의 tieBreakKey와 같은 해시(FNV-1a + fmix32 마무리 섞기)
export function tieBreakKey(seed, recipeId) {
  let h = 0x811c9dc5;
  for (const ch of `${seed}#${recipeId}`) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// 15분 이하 '빠른 요리' 기준(사용자 결정 2026-10-16). 선별 상한은 30분으로 늘었지만 짧은 요리를 먼저 보여 준다.
export const QUICK_COOK_MAX_MIN = 15;
// 추천 목록 최대 개수(서버 상수와 같은 값)
const RECOMMENDATION_MAX = 5;

// 추천 정렬 비교 함수 — FUNCTIONS.md F08 6항을 목업에서 그대로 흉내 낸다(실제 정렬의 주인은 백엔드 S5).
// ① 내 재고 사용 먼저 ② 부족 재료 0개 먼저 ③ 같은 그룹 안에서 15분 이하 먼저 ④ score 내림차순 ⑤ 동점 무작위(tieKey) ⑥ id 오름차순
export function compareRecommendations(a, b) {
  const quick = (r) => Number(r.cook_time_min <= QUICK_COOK_MAX_MIN);
  return (
    Number(Boolean(b.usesStock)) - Number(Boolean(a.usesStock)) ||
    Number(b.missing.length === 0) - Number(a.missing.length === 0) ||
    quick(b) - quick(a) ||
    b.score - a.score ||
    (a.tieKey ?? 0) - (b.tieKey ?? 0) ||
    a.id - b.id
  );
}

// 아주 단순화한 검색(F13, 서버 domain/recipeSearch.js 흉내): 요리명 공백 무시 부분 일치 또는 재료명 정확 일치(동의어 없음)
// 정렬: 일치 등급(요리명+재료 > 요리명만 > 재료만) → 부족 적은 순 → 가나다 → id, 최대 20개. missing·urgent_used는 추천 계산을 그대로 쓴다.
const SEARCH_RESULT_MAX = 20;
function searchMock(inventory, today, query) {
  const compact = (t) => t.replace(/\s+/g, '').toLowerCase();
  const key = compact(query);
  const evaluated = new Map(evaluateAll(inventory, today, '').map((r) => [r.id, r]));
  return RECIPES.map((r) => ({ r, rank: (compact(r.title).includes(key) ? 2 : 0) + (r.ingredients.some((i) => i.name === query) ? 1 : 0) }))
    .filter(({ rank }) => rank > 0)
    .map(({ r, rank }) => {
      const { urgent_used, missing } = evaluated.get(r.id);
      return { id: r.id, title: r.title, cook_time_min: r.cook_time_min, urgent_used, missing, substitutes: [], rank };
    })
    .sort((a, b) => b.rank - a.rank || a.missing.length - b.missing.length || a.title.localeCompare(b.title, 'ko') || a.id - b.id)
    .slice(0, SEARCH_RESULT_MAX)
    .map(({ rank, ...rest }) => rest);
}

async function handle(url, init) {
  const { pathname, searchParams } = new URL(url, window.location.origin);
  const path = pathname.replace(/^\/api/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : undefined;
  const db = loadDb();
  const today = seoulToday();
  const sw = failSwitch();

  // --- 인증 없이 호출 ---
  if (method === 'POST' && path === '/auth/signup') {
    if (!/^[A-Za-z0-9]{4,20}$/.test(body?.username ?? '') || (body?.password ?? '').length < 8) {
      return fail(400, 'INVALID_INPUT', '입력 형식을 확인해 주세요.');
    }
    if (db.users[body.username]) return fail(409, 'DUPLICATE', '이미 사용 중인 아이디예요.');
    db.users[body.username] = { id: Object.keys(db.users).length + 1, password: body.password };
    seedInventory(db, body.username);
    saveDb(db);
    return json(201, { token: `mock.${body.username}`, user: { id: db.users[body.username].id, username: body.username } });
  }
  if (method === 'POST' && path === '/auth/login') {
    const user = db.users[body?.username];
    if (!user || user.password !== body?.password) return fail(401, 'UNAUTHORIZED', '아이디 또는 비밀번호가 올바르지 않아요.');
    return json(200, { token: `mock.${body.username}`, user: { id: user.id, username: body.username } });
  }

  // --- 보호 API: Bearer mock.<username> ---
  const username = (init.headers?.Authorization ?? '').replace(/^Bearer mock\./, '');
  if (!username || !db.users[username]) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.');
  const inventory = db.inventories[username] ?? [];
  const seed = `${db.users[username].id}:${today}`;

  if (method === 'GET' && path === '/auth/me') return json(200, { id: db.users[username].id, username });

  // 항상 있다고 보는 재료: 실제 서버처럼 기준 데이터 양념(가나다순) + 밥
  if (method === 'GET' && path === '/seasonings') {
    if (sw === 'seasonings') return fail(500, 'SERVER_ERROR', 'mock');
    return json(200, SEASONING_LIST);
  }

  if (method === 'GET' && path === '/one-touch') {
    if (sw === 'one-touch') return fail(500, 'SERVER_ERROR', 'mock');
    return json(200, ONE_TOUCH);
  }

  if (method === 'GET' && path === '/ingredients') {
    if (sw === 'ingredients') return fail(500, 'SERVER_ERROR', 'mock');
    const list = inventory.map((i) => view(i, today)).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date) || a.id - b.id);
    return json(200, list);
  }

  if (method === 'POST' && path === '/ingredients') {
    if (sw === 'create') return fail(500, 'SERVER_ERROR', 'mock');
    const name = (body?.name ?? '').trim();
    if (!name) return fail(400, 'INVALID_INPUT', '재료명을 입력해 주세요.');
    // 재료명 최대 30자(앞뒤 공백 제외, 사용자 결정 2026-10-19) — 실제 서버와 같은 규칙
    if ([...name].length > 30) return fail(400, 'INVALID_INPUT', '재료명은 30자 이하로 입력해 주세요.');
    // 양념은 재고로 등록하지 않는다(사용자 결정 2026-10-19). 목업은 동의어 정규화가 없어 정확한 이름만 막는다.
    if (MOCK_SEASONINGS.includes(name)) return fail(400, 'ALWAYS_OWNED', '양념은 등록하지 않아도 돼요.');
    const days = ONE_TOUCH.find((o) => o.name === name)?.fridge_days ?? 7;
    const item = { id: db.nextId++, name, expiry_date: body.expiry_date ?? addDays(today, days) };
    inventory.push(item);
    db.inventories[username] = inventory;
    saveDb(db);
    return json(201, view(item, today));
  }

  if (method === 'DELETE' && path === '/ingredients/expired') {
    const keep = inventory.filter((i) => diffDays(i.expiry_date, today) >= 0);
    const deleted = inventory.length - keep.length;
    db.inventories[username] = keep;
    saveDb(db);
    return json(200, { deleted });
  }

  const ingMatch = /^\/ingredients\/(\d+)$/.exec(path);
  if (ingMatch) {
    const id = Number(ingMatch[1]);
    const item = inventory.find((i) => i.id === id);
    if (!item) return fail(404, 'NOT_FOUND', '재료를 찾을 수 없어요.');
    if (method === 'PATCH') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body?.expiry_date ?? '')) return fail(400, 'INVALID_INPUT', '날짜 형식을 확인해 주세요.');
      item.expiry_date = body.expiry_date;
      saveDb(db);
      return json(200, view(item, today));
    }
    if (method === 'DELETE') {
      db.inventories[username] = inventory.filter((i) => i.id !== id);
      saveDb(db);
      return new Response(null, { status: 204 });
    }
  }

  if (method === 'GET' && path === '/rescue') {
    if (sw === 'rescue') return fail(500, 'SERVER_ERROR', 'mock');
    const items = inventory
      .map((i) => view(i, today))
      .filter((i) => i.status === 'urgent')
      .sort((a, b) => a.d_day - b.d_day)
      .map(({ id, name, d_day }) => ({ id, name, d_day }));
    const recipes = recommend(inventory, today, seed, { limit: 3, pool: 10 }) // 상위 10개 중 3개(서버와 같은 값)
      .map(({ id, title, cook_time_min }) => ({ id, title, cook_time_min }));
    return json(200, { items, recipes, message: items.length ? '오늘 먼저 써보세요' : '여유 있어요' });
  }

  if (method === 'GET' && path === '/recommendations') {
    if (sw === 'recommendations') return fail(500, 'SERVER_ERROR', 'mock');
    // 사용자 결정: 추천은 최대 5개(2026-10-15). limit 파라미터는 없다(2026-10-19) — 쿼리가 와도 무시한다.
    // 2026-10-19: { key_menus(대표 메뉴 3개), recipes(일반 추천 5개, 대표 메뉴로 뽑힌 것 제외) }
    return json(200, recommendationPage(inventory, today, seed));
  }

  // /recipes/search를 /recipes/:id보다 먼저 확인한다(서버 라우터와 같은 순서)
  if (method === 'GET' && path === '/recipes/search') {
    if (sw === 'search') return fail(500, 'SERVER_ERROR', 'mock');
    const all = searchParams.getAll('q');
    const query = all.length === 1 ? all[0].normalize('NFC').trim().replace(/\s+/g, ' ') : '';
    if (!query || [...query].length > 30) return fail(400, 'INVALID_INPUT', '검색어를 1~30자로 입력해 주세요.');
    return json(200, searchMock(inventory, today, query));
  }

  const recipeMatch = /^\/recipes\/(\d+)(\/cook)?$/.exec(path);
  if (recipeMatch) {
    const recipe = RECIPES.find((r) => r.id === Number(recipeMatch[1]));
    if (!recipe) return fail(404, 'NOT_FOUND', '레시피를 찾을 수 없어요.');
    if (method === 'GET' && !recipeMatch[2]) {
      if (sw === 'recipe') return fail(500, 'SERVER_ERROR', 'mock');
      // 같은 재료 재고가 여러 개면 유통기한이 가장 이른(만료 제외) 재고를 연결 — 동일 날짜면 id가 작은 것(사용자 결정)
      const usable = inventory
        .map((i) => view(i, today))
        .filter((i) => i.status !== 'expired')
        .sort((a, b) => a.d_day - b.d_day || a.id - b.id);
      return json(200, {
        ...recipe,
        ingredients: recipe.ingredients.map((ing) => {
          const mine = usable.find((u) => u.name === ing.name);
          // 양념·밥은 항상 보유. 밥은 실제 재고가 있으면 그 재고를 연결해 요리 완료로 지울 수 있게 한다(사용자 결정 2026-10-19)
          const alwaysOwned = ing.is_seasoning || ing.name === '밥';
          return { ...ing, owned: alwaysOwned || Boolean(mine), my_ingredient_id: ing.is_seasoning ? null : mine?.id ?? null, substitute: null };
        }),
      });
    }
    if (method === 'POST' && recipeMatch[2]) {
      if (sw === 'cook') return fail(500, 'SERVER_ERROR', 'mock');
      const raw = body?.used_ingredient_ids;
      if (!Array.isArray(raw) || raw.some((x) => !Number.isInteger(x))) return fail(400, 'INVALID_INPUT', '입력 형식을 확인해 주세요.');
      // 같은 ID가 여러 번 와도 한 번 고른 것으로 본다(사용자 결정 2026-10-19) → deleted는 실제 삭제 수
      const ids = [...new Set(raw)];
      if (ids.some((x) => !inventory.some((i) => i.id === x))) return fail(404, 'NOT_FOUND', '재료를 찾을 수 없어요.');
      db.inventories[username] = inventory.filter((i) => !ids.includes(i.id));
      db.history.push({ id: db.history.length + 1, username, recipe_id: recipe.id });
      saveDb(db);
      return json(200, { deleted: ids.length, history_id: db.history.length });
    }
  }

  return fail(404, 'NOT_FOUND', '없는 API예요.');
}

export function installMockServer() {
  console.info('[mock] 개발용 목업 모드: /api 요청을 브라우저 안의 가짜 서버가 처리합니다.');
  setTransport(
    (url, init) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => handle(url, init).then(resolve, reject), LATENCY_MS);
        init.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
}
