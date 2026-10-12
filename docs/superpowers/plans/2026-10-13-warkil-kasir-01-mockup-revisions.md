# Warkil-Kasir — Phase 1 (Mockup Revisions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply revisions 1–3 of the spec to the existing frontend mockup — cashier navigation plus a sessionStorage-backed cart, complete removal of the online-order subsystem, and the "Semua" category chip on OwnerMenu.

**Architecture:** UI-only phase against the existing mock store (`store.jsx` + `localStorage`). No API calls are introduced; the cart logic is extracted into a pure reducer so it survives the Phase 4 integration unchanged, and the online-order subsystem is deleted rather than stubbed.

**Tech Stack:** React 18, react-router-dom 6, Vite 5, plain CSS (`index.css`), Vitest + jsdom + @testing-library/react, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-10-13-warkil-kasir-design.md` (see §8.2 revisions 1–3, §8.1, §9)

## Global Constraints

- Frontend stays JavaScript/JSX. No TypeScript conversion, no Tailwind, no UI kit.
- UI copy is Indonesian; code identifiers are English.
- Reuse the existing components and CSS classes. New CSS only for what is added; remove CSS that only served deleted features.
- Do not convert the mockup's business logic; Phase 2+ moves it to the backend. Phase 1 only applies revisions 1–3.
- Every phase ends with lint, build, tests, a manual run-through, and a conventional commit.
- Deliverable of this phase: `.queue-big.online`, `.platform*`, `.pcode` and `.driver` no longer exist; no file mentions online orders, GoFood, GrabFood, ShopeeFood, `PLATFORMS`, `DRIVERS`, `sourceLabel` or `channel`.

## Review Focus

- A shared tablet: the next cashier must not inherit the previous cashier's in-progress cart. Pinned by a test in the Phase 2 plan (auth task), because the cart is only cleared on login once auth exists.
- A mid-order page reload must keep the cart, and a "Kosongkan" must empty it — pinned in Task 2.
- Adding the same menu twice must increment one line, never create two — pinned in Task 1.
- Removing the online subsystem must leave no `channel`/`driver`/`ref` field, no Sumber column, and no online queue styling — grep gate in Task 4 and Task 6.
- OwnerMenu "Semua" must include menus from every category and must keep the active filter after saving — pinned in Task 5.

---

### Task 1: Frontend test tooling and the cart reducer

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Create: `frontend/eslint.config.js`
- Create: `frontend/src/context/cartReducer.js`
- Test: `frontend/src/context/cartReducer.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `cartReducer(state, action)`, `emptyCart`, `cartCount(state)`, `cartTotal(state)`, `qtyOf(state, id)` from `src/context/cartReducer.js`. State shape: `{ lines: [{ id, name, price, qty, note }], orderType: 'dine' | 'take' }`. Actions: `{ type: 'add', menu: { id, name, price } }`, `{ type: 'step', id, delta }`, `{ type: 'remove', id }`, `{ type: 'note', id, note }`, `{ type: 'orderType', orderType }`, `{ type: 'clear' }`.

- [ ] **Step 1: Add the test and lint tooling**

`frontend/package.json` — add to `devDependencies` and `scripts`:

```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --host",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@testing-library/react": "^16.1.0",
    "@vitejs/plugin-react": "^4.3.3",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "globals": "^15.14.0",
    "jsdom": "^25.0.1",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

Run: `cd frontend && npm install`

- [ ] **Step 2: Configure Vitest and ESLint**

`frontend/vite.config.js` — replace the whole file:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host + allowedHosts dibuka supaya bisa diakses lewat VS Code Port Forwarding (Dev Tunnels)
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 4173, allowedHosts: true },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.js'] },
});
```

`frontend/eslint.config.js` — create:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

- [ ] **Step 3: Write the failing reducer test**

`frontend/src/context/cartReducer.test.js`:

```js
import { cartCount, cartReducer, cartTotal, emptyCart, qtyOf } from './cartReducer.js';

const sop = { id: 'm1', name: 'Sop Kikil', price: 25000 };
const es = { id: 'd2', name: 'Es Teh Manis', price: 5000 };

test('add creates a line the first time and increments it after', () => {
  const once = cartReducer(emptyCart, { type: 'add', menu: sop });
  const twice = cartReducer(once, { type: 'add', menu: sop });
  expect(twice.lines).toHaveLength(1);
  expect(qtyOf(twice, 'm1')).toBe(2);
  expect(cartTotal(twice)).toBe(50000);
});

test('add keeps separate lines for separate menus', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'add', menu: es });
  expect(state.lines.map((l) => l.id)).toEqual(['m1', 'd2']);
  expect(cartCount(state)).toBe(2);
  expect(cartTotal(state)).toBe(30000);
});

test('stepping a line below one item removes it', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'step', id: 'm1', delta: -1 });
  expect(state.lines).toEqual([]);
});

test('note is stored per line', () => {
  const state = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'note', id: 'm1', note: 'tanpa sambal' });
  expect(state.lines[0].note).toBe('tanpa sambal');
});

test('remove drops only the requested line', () => {
  const both = cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'add', menu: es });
  expect(cartReducer(both, { type: 'remove', id: 'd2' }).lines.map((l) => l.id)).toEqual(['m1']);
});

test('clear resets lines and order type', () => {
  const state = cartReducer(
    cartReducer(cartReducer(emptyCart, { type: 'add', menu: sop }), { type: 'orderType', orderType: 'take' }),
    { type: 'clear' }
  );
  expect(state).toEqual({ lines: [], orderType: 'dine' });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `Failed to resolve import "./cartReducer.js"`.

- [ ] **Step 5: Write the reducer**

`frontend/src/context/cartReducer.js`:

```js
// Harga di keranjang hanya untuk tampilan; server yang menghitung harga pesanan.
export const emptyCart = { lines: [], orderType: 'dine' };

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { id, name, price } = action.menu;
      const existing = state.lines.find((l) => l.id === id);
      const lines = existing
        ? state.lines.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...state.lines, { id, name, price, qty: 1, note: '' }];
      return { ...state, lines };
    }
    case 'step':
      return {
        ...state,
        lines: state.lines
          .map((l) => (l.id === action.id ? { ...l, qty: l.qty + action.delta } : l))
          .filter((l) => l.qty > 0),
      };
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };
    case 'note':
      return { ...state, lines: state.lines.map((l) => (l.id === action.id ? { ...l, note: action.note } : l)) };
    case 'orderType':
      return { ...state, orderType: action.orderType };
    case 'clear':
      return emptyCart;
    default:
      return state;
  }
}

export const cartCount = (state) => state.lines.reduce((sum, l) => sum + l.qty, 0);
export const cartTotal = (state) => state.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
export const qtyOf = (state, id) => state.lines.find((l) => l.id === id)?.qty || 0;
```

- [ ] **Step 6: Run the tests and the linter**

Run: `cd frontend && npm test && npm run lint`
Expected: 6 tests PASS. Lint may report pre-existing warnings in files untouched by this task — fix any error it reports, leave nothing broken.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/eslint.config.js frontend/src/context/cartReducer.js frontend/src/context/cartReducer.test.js
git commit -m "test(frontend): add vitest, eslint and the cart reducer"
```

---

### Task 2: CartContext persisted in sessionStorage

**Files:**
- Create: `frontend/src/context/CartContext.jsx`
- Test: `frontend/src/context/CartContext.test.jsx`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/pages/cashier/Pos.jsx`
- Modify: `frontend/src/pages/cashier/PayModal.jsx`

**Interfaces:**
- Consumes: `cartReducer`, `emptyCart`, `cartCount`, `cartTotal`, `qtyOf` (Task 1).
- Produces: `CartProvider` and `useCart()` returning `{ lines, orderType, dispatch, count, total }`. `useCart()` throws when used outside the provider. `PayModal` keeps its existing props minus `cart`, `total`, `orderType` — it reads the cart from the context and dispatches `{ type: 'clear' }` when the cashier starts a new order.

- [ ] **Step 1: Write the failing persistence test**

`frontend/src/context/CartContext.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { CartProvider, useCart } from './CartContext.jsx';

function Probe() {
  const { lines, count, total, dispatch } = useCart();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="total">{total}</span>
      <span data-testid="lines">{lines.map((l) => `${l.qty}x${l.name}`).join(',')}</span>
      <button onClick={() => dispatch({ type: 'add', menu: { id: 'm1', name: 'Sop Kikil', price: 25000 } })}>add</button>
      <button onClick={() => dispatch({ type: 'clear' })}>clear</button>
    </div>
  );
}

const mount = () =>
  render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );

beforeEach(() => sessionStorage.clear());

test('persists the cart to sessionStorage', () => {
  mount();
  act(() => screen.getByText('add').click());
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([
    { id: 'm1', name: 'Sop Kikil', price: 25000, qty: 1, note: '' },
  ]);
});

test('rehydrates the cart after a remount', () => {
  sessionStorage.setItem('kikil:cart', JSON.stringify({ lines: [{ id: 'd2', name: 'Es Teh Manis', price: 5000, qty: 3, note: '' }], orderType: 'take' }));
  mount();
  expect(screen.getByTestId('count').textContent).toBe('3');
  expect(screen.getByTestId('total').textContent).toBe('15000');
});

test('survives corrupted storage instead of crashing', () => {
  sessionStorage.setItem('kikil:cart', 'not json');
  mount();
  expect(screen.getByTestId('count').textContent).toBe('0');
});

test('clear empties the persisted cart', () => {
  mount();
  act(() => screen.getByText('add').click());
  act(() => screen.getByText('clear').click());
  expect(screen.getByTestId('lines').textContent).toBe('');
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/context/CartContext.test.jsx`
Expected: FAIL — `Failed to resolve import "./CartContext.jsx"`.

- [ ] **Step 3: Write the provider**

`frontend/src/context/CartContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartCount, cartReducer, cartTotal, emptyCart } from './cartReducer.js';

const KEY = 'kikil:cart';
const Ctx = createContext(null);
export const useCart = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useCart harus dipakai di dalam CartProvider');
  return value;
};

function readStored() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY));
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCart;
    return { lines: parsed.lines, orderType: parsed.orderType === 'take' ? 'take' : 'dine' };
  } catch {
    return emptyCart;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, readStored);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* sessionStorage penuh atau diblokir — keranjang tetap jalan di memori */
    }
  }, [state]);

  const value = useMemo(
    () => ({ ...state, dispatch, count: cartCount(state), total: cartTotal(state) }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/context/CartContext.test.jsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Mount the provider**

`frontend/src/main.jsx` — wrap the app:

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import { CartProvider } from './context/CartContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 6: Move Pos onto the context**

`frontend/src/pages/cashier/Pos.jsx` — replace the local cart state and handlers. Remove `useState` for `cart`/`orderType` and the `qtyOf`/`add`/`step`/`remove`/`setNote`/`reset` definitions; keep `noteOpen` as local UI state. Keep the `priceOf` import from `../../data.js` — Step 6's `add` handler still needs it to put a display price on the line.

```jsx
import { useMemo, useState } from 'react';
import MenuCard from '../../components/MenuCard.jsx';
import Icon from '../../components/Icon.jsx';
import PayModal from './PayModal.jsx';
import { useStore } from '../../store.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { qtyOf as qtyInCart } from '../../context/cartReducer.js';
import { sortMenus } from '../../selectors.js';
import { rupiah } from '../../utils.js';

export default function Pos() {
  const { menus, categories, best } = useStore();
  const cart = useCart();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [noteOpen, setNoteOpen] = useState(null);
  const [pay, setPay] = useState(false);

  const rank = useMemo(() => new Map(best.map((b) => [b.id, b])), [best]);
  const catOrder = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = menus;
    if (term) list = list.filter((m) => m.name.toLowerCase().includes(term));
    else if (cat !== 'all') list = list.filter((m) => m.cat === cat);
    return sortMenus(list, rank, cat === 'all' || term ? catOrder : undefined);
  }, [menus, cat, q, rank, catOrder]);

  const reset = () => {
    cart.dispatch({ type: 'clear' });
    setNoteOpen(null);
    setPay(false);
  };
```

In the JSX that follows, replace the cart reads and writes:

- `qtyOf(m.id)` → `qtyInCart(cart, m.id)` (import alias above; `qtyOf` from the reducer takes the cart state).
- `onClick={() => add(m)}` → `onClick={() => cart.dispatch({ type: 'add', menu: { id: m.id, name: m.name, price: priceOf(m, menus) } })}` — keep the `priceOf` import from `../../data.js` for this one call.
- The bill lines map over `cart.lines`; `step(i.id, -1)` → `cart.dispatch({ type: 'step', id: i.id, delta: -1 })`; `remove(i.id)` → `cart.dispatch({ type: 'remove', id: i.id })`; `setNote(i.id, e.target.value)` → `cart.dispatch({ type: 'note', id: i.id, note: e.target.value })`.
- `count` → `cart.count`, `total` → `cart.total`.
- `cart.length` occurrences → `cart.lines.length`; `disabled={!cart.length}` → `disabled={!cart.lines.length}`.
- Order-type segment: `orderType === 'dine'` → `cart.orderType === 'dine'`, `setOrderType('dine')` → `cart.dispatch({ type: 'orderType', orderType: 'dine' })`, and the `take` pair likewise.
- The zero-lines empty state condition becomes `cart.lines.length === 0`.
- `{pay && <PayModal orderType={cart.orderType} onClose={() => setPay(false)} onDone={reset} />}`.

- [ ] **Step 7: Move PayModal onto the context**

`frontend/src/pages/cashier/PayModal.jsx` — change the signature and the finalize path so paying clears the cart:

```jsx
export default function PayModal({ onClose, onDone }) {
  const { createOrder, session } = useStore();
  const cart = useCart();
  const [step, setStep] = useState('choose'); // choose | cash | qris | done
  const [received, setReceived] = useState('');
  const [tx, setTx] = useState(null);
  const [receipt, setReceipt] = useState(false);
  const ref = useRef(`KKA${Date.now().toString().slice(-6)}`);

  const total = cart.total;

  const finalize = (payment) => {
    const t = createOrder({
      channel: 'kasir',
      orderType: cart.orderType,
      payment,
      status: 'proses',
      cashier: session?.cashier,
      items: cart.lines.map(({ id, name, qty, price, note }) => ({ id, name, qty, price, note })),
    });
    setTx(t);
    setStep('done');
  };
```

and the "Pesanan baru" button calls `onDone`, which is Pos's `reset` — it already dispatches `clear`. Import `useCart` from `../../context/CartContext.jsx`.

- [ ] **Step 8: Verify in the running app**

Run: `cd frontend && npm run build && npm run dev`
Then, at `http://localhost:5173/kasir`: add two menus, add a note, open `/kasir/penjualan` from the drawer, return to `/kasir` — the bill is intact. Reload the page — the bill is still intact. Press "Kosongkan" — the bill empties and stays empty after a reload. Complete a payment — the bill empties.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/main.jsx frontend/src/context/CartContext.jsx frontend/src/context/CartContext.test.jsx frontend/src/pages/cashier/Pos.jsx frontend/src/pages/cashier/PayModal.jsx
git commit -m "feat(frontend): persist the cashier cart across navigation"
```

---

### Task 3: "Buat Pesanan" in the cashier navigation

**Files:**
- Modify: `frontend/src/components/Shell.jsx`
- Modify: `frontend/src/pages/cashier/CashierLayout.jsx`
- Test: `frontend/src/pages/cashier/CashierLayout.test.jsx`

**Interfaces:**
- Consumes: `useStore()` from `src/store.jsx` (session, logout, now).
- Produces: `Shell` accepts an optional `end: true` on a nav item to switch `NavLink` to exact matching. `CashierLayout`'s first nav item is `{ to: '/kasir', label: 'Buat Pesanan', icon: 'cart', end: true }`.

- [ ] **Step 1: Write the failing navigation test**

`frontend/src/pages/cashier/CashierLayout.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../store.jsx', () => ({
  useStore: () => ({ session: { cashier: 'Siti Rahma' }, logout: vi.fn(), now: new Date(2026, 9, 13, 10, 0) }),
}));
vi.mock('../../components/EventBanner.jsx', () => ({ default: () => null }));

const { default: CashierLayout } = await import('./CashierLayout.jsx');

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/kasir" element={<CashierLayout />}>
          <Route index element={<div>pos</div>} />
          <Route path="penjualan" element={<div>penjualan</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

test('has a "Buat Pesanan" entry that is active on the POS page', () => {
  renderAt('/kasir');
  const link = screen.getByRole('link', { name: /buat pesanan/i });
  expect(link.getAttribute('href')).toBe('/kasir');
  expect(link.className).toContain('active');
});

test('"Buat Pesanan" is not active on another cashier page, so it can be clicked back', () => {
  renderAt('/kasir/penjualan');
  expect(screen.getByRole('link', { name: /buat pesanan/i }).className).not.toContain('active');
  expect(screen.getByRole('link', { name: /penjualan/i }).className).toContain('active');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/cashier/CashierLayout.test.jsx`
Expected: FAIL — `Unable to find role="link"` with name `/buat pesanan/i`.

- [ ] **Step 3: Support exact matching in Shell**

`frontend/src/components/Shell.jsx` — the `NavLink` branch:

```jsx
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) => 'drawer-item' + (isActive ? ' active' : '')}
              >
```

- [ ] **Step 4: Add the nav item**

`frontend/src/pages/cashier/CashierLayout.jsx` — the items array becomes:

```jsx
  const items = [
    { to: '/kasir', label: 'Buat Pesanan', icon: 'cart', end: true },
    { to: '/kasir/penjualan', label: 'Penjualan', icon: 'receipt' },
    { to: '/kasir/pesanan', label: 'Pesanan Kasir', icon: 'cart' },
    { to: '/kasir/online', label: 'Pesanan Online', icon: 'bag' },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: () => {
        logout();
        nav('/kasir/login');
      },
    },
  ];
```

The `Pesanan Online` item is removed in Task 4; leave it here so this task's tests pass on their own, and let Task 4 delete it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/cashier/CashierLayout.test.jsx`
Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Shell.jsx frontend/src/pages/cashier/CashierLayout.jsx frontend/src/pages/cashier/CashierLayout.test.jsx
git commit -m "feat(frontend): add a Buat Pesanan entry to the cashier nav"
```

---

### Task 4: Remove the online-order subsystem

**Files:**
- Delete: `frontend/src/pages/cashier/OnlineOrders.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/cashier/CashierLayout.jsx`
- Modify: `frontend/src/pages/cashier/DineOrders.jsx`
- Modify: `frontend/src/pages/cashier/PayModal.jsx`
- Modify: `frontend/src/pages/cashier/CashierSales.jsx`
- Modify: `frontend/src/pages/owner/OwnerSales.jsx`
- Modify: `frontend/src/pages/owner/OwnerPerformance.jsx`
- Modify: `frontend/src/pages/Landing.jsx`
- Modify: `frontend/src/components/Receipt.jsx`
- Modify: `frontend/src/components/Shell.jsx`
- Modify: `frontend/src/data.js`
- Modify: `frontend/src/selectors.js`
- Modify: `frontend/src/store.jsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: `statusLabel(tx)` takes the mock status only (`proses`, `siap`, `selesai`, `batal`); `generateHistory` emits no `channel`, `driver`, `ref` or `online` fields; a shared `orderTypeLabel(tx)` helper in `selectors.js` returns `'Takeaway'` or `'Makan di tempat'`; `PAYMENT_LABELS` are unchanged (`Cash`, `QRIS`).

- [ ] **Step 1: Delete the page and its route**

```bash
git rm frontend/src/pages/cashier/OnlineOrders.jsx
```

`frontend/src/App.jsx` — remove the `OnlineOrders` import and `<Route path="online" element={<OnlineOrders />} />`.

- [ ] **Step 2: Remove the nav item**

`frontend/src/pages/cashier/CashierLayout.jsx` — delete the `{ to: '/kasir/online', ... }` entry.

- [ ] **Step 3: Add the order-type helper and drop the online helpers**

`frontend/src/selectors.js` — remove the `PLATFORMS` import, `isOnline`, `sourceLabel`, and simplify `statusLabel`:

```js
import { addDays, pad, parseYmd, shiftIndexOf, ymd } from './utils.js';
import { SHIFTS, scheduledCashier, shiftTimes } from './data.js';

export const NON_SALE = ['batal'];
export const isSale = (t) => !NON_SALE.includes(t.status);
export const txQty = (t) => t.items.reduce((s, i) => s + i.qty, 0);
export const orderTypeLabel = (t) => (t.orderType === 'take' ? 'Takeaway' : 'Makan di tempat');

export function statusLabel(t) {
  switch (t.status) {
    case 'batal': return 'Dibatalkan';
    case 'proses': return 'Diproses';
    case 'siap': return 'Siap diambil';
    case 'selesai': return 'Selesai';
    default: return t.status;
  }
}
```

Leave `statusTone`, `buildIndex`, `rangeSum`, `getShifts`, `cashierTotals`, `bestSellers` and `sortMenus` untouched.

- [ ] **Step 4: Strip the channel machinery out of the generator**

`frontend/src/data.js` — delete `DRIVERS` and `PLATFORMS`. In `generateHistory`, inside the per-order loop, drop the `channel`/`online` roll, the driver and ref rolls, and the `take` flag's dependency on `online`; the per-day queues become a single three-digit sequence and the payment label is cash or QRIS:

```js
      const lines = 1 + Math.floor(rng() * 3);
      const chosen = new Map();
      for (let j = 0; j < lines; j++) {
        const id = ids[pickIndex(rng, wts)];
        const m = menus.find((x) => x.id === id);
        const q = m.items ? 1 : rng() < 0.25 ? 2 : 1;
        chosen.set(id, (chosen.get(id) || 0) + q);
      }
      const payRoll = rng();
      const take = rng() < 0.2;
      const mins = hour * 60 + minute;
      if (date === today && mins > nowMin - 2) continue;
      list.push({ mins, chosen, payRoll, take });
```

and the emit loop:

```js
    list.sort((a, b) => a.mins - b.mins);
    let seq = 0;

    for (const t of list) {
      seq++;
      const time = `${pad(Math.floor(t.mins / 60))}:${pad(t.mins % 60)}`;
      const items = [...t.chosen.entries()].map(([id, qty]) => {
        const m = menus.find((x) => x.id === id);
        return { id, name: m.name, qty, price: priceOf(m, menus) };
      });
```

`t.chosen` is no longer on the pushed object, so keep `chosen` on it: push `{ mins, chosen, payRoll, take }` (already corrected above). The rest of the emit path becomes:

```js
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const age = date === today ? nowMin - t.mins : 9999;
      const status = age > 25 ? 'selesai' : age > 12 ? 'siap' : 'proses';
      out.push({
        id: `TRX-${date.replace(/-/g, '')}-${pad(seq, 4)}`,
        date,
        time,
        queue: pad(seq, 3),
        orderType: t.take ? 'take' : 'dine',
        payment: t.payRoll < 0.55 ? 'Cash' : 'QRIS',
        items,
        note: '',
        total,
        status,
        cashier: scheduledCashier(date, shiftIndexOf(time)),
      });
```

Remove the now-unused `plat` counter and `kasirSeq`.

- [ ] **Step 5: Remove the online notification from the store**

`frontend/src/store.jsx` — delete the `prevLen` ref and the whole `useEffect` that notifies about online orders, plus the `extra` dependency that only served it. In `createOrder`, drop the `channel` parameter and stop storing `channel`, `source`, `driver` or `ref` on the transaction; the stored shape is `{ id, date, time, queue, orderType, payment, items, note, total, status, cashier }`. In `frontend/src/pages/cashier/PayModal.jsx`, delete `channel: 'kasir'` from the `createOrder({...})` call so the Step 10 grep for `channel` comes back empty. Nothing else in the store changes in this task.

- [ ] **Step 6: Rewrite the three tables' Sumber column and the filters**

`frontend/src/pages/cashier/CashierSales.jsx` — delete the `SOURCES` constant, the `src` state, the source chips block and the `srcOk` filter term; import `orderTypeLabel` instead of `sourceLabel`; the header cell `<th>Sumber</th>` becomes `<th>Tipe</th>` and the body cell becomes `<td>{orderTypeLabel(t)}</td>`; the subtitle becomes:

```jsx
        <p className="muted">{fmtDateLong(today)} · semua pesanan hari ini</p>
```

`frontend/src/pages/owner/OwnerSales.jsx` — swap the `sourceLabel` import for `orderTypeLabel`, `<th>Sumber</th>` → `<th>Tipe</th>`, `<td>{sourceLabel(t)}</td>` → `<td>{orderTypeLabel(t)}</td>`.

`frontend/src/pages/owner/OwnerPerformance.jsx` — same swap in the per-shift table header and body cells.

`frontend/src/pages/cashier/DineOrders.jsx` — the board no longer filters by channel:

```jsx
  const list = (index.byDate.get(today) || [])
    .filter((t) => {
      if (filter === 'aktif') return t.status === 'proses' || t.status === 'siap';
      if (filter === 'selesai') return t.status === 'selesai';
      return true;
    })
    .slice()
    .reverse();
```

and replace its inline `t.orderType === 'take' ? 'Takeaway' : 'Makan di tempat'` with `orderTypeLabel(t)`.

- [ ] **Step 7: Drop the kitchen copy and the platform tag from the receipt**

`frontend/src/components/Receipt.jsx` — remove the `PLATFORMS` and `isOnline` imports, the `kitchen` flag, the `rc-tag` block, and the two conditional branches that depended on `kitchen`. `Receipt` renders the single customer copy:

```jsx
export function Receipt({ tx }) {
  return (
    <div className="receipt">
      <div className="rc-shop">{SHOP.name}</div>
      <div className="rc-addr">{SHOP.address}</div>
      <div className="rc-q-label">NOMOR ANTRIAN</div>
      <div className="rc-q">{tx.queue || '---'}</div>
      <div className="rc-sep" />
      <div className="rc-meta">
        <div>Tanggal : {fmtDateShort(tx.date)} {tx.time}</div>
        <div>Kasir : {tx.cashier}</div>
        <div>ID Transaksi : {tx.id}</div>
        <div>Tipe : {orderTypeLabel(tx)}</div>
      </div>
      <div className="rc-sep dashed" />
      <div className="rc-items">
        {tx.items.map((it, i) => (
          <div key={i} className="rc-item">
            <div className="rc-row">
              <span>
                {it.qty}× {it.name}
              </span>
              <span>{rupiah(it.price * it.qty)}</span>
            </div>
            {it.note && <div className="rc-note">» {it.note}</div>}
          </div>
        ))}
      </div>
      {tx.note && <div className="rc-note">Catatan: {tx.note}</div>}
      <div className="rc-sep dashed" />
      <div className="rc-row rc-total">
        <span>TOTAL</span>
        <span>{rupiah(tx.total)}</span>
      </div>
      <div className="rc-row">
        <span>Pembayaran</span>
        <span>{tx.payment}</span>
      </div>
      <div className="rc-sep" />
      <div className="rc-foot">Terima kasih! Simpan nota ini sebagai bukti pembayaran.</div>
    </div>
  );
}

export function ReceiptModal({ tx, onClose }) {
  return (
    <Modal
      title="Cetak Nota"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="print" size={18} /> Cetak nota
          </button>
        </>
      }
    >
      <div className="print-area">{<div className="rc-page"><Receipt tx={tx} /></div>}</div>
    </Modal>
  );
}
```

`PayModal.jsx` calls `<ReceiptModal tx={tx} onClose={...} />` unchanged, but the button label in the done step becomes "Cetak nota".

- [ ] **Step 8: Remove the demo copy and the demo links**

`frontend/src/pages/Landing.jsx` — hero paragraph becomes `Sistem kasir Warung Kikil Abang.`, the cashier card copy becomes `Tampilan tablet: input pesanan, bayar cash atau QRIS.`, and the `landing-foot` section (the "Reset data demo" button) is deleted along with the `resetDemo` import and the `useStore` call.

`frontend/src/components/Shell.jsx` — the drawer footer link reads "← Ganti peran (demo)"; delete the whole `drawer-foot` block. `Shell` keeps no footer until auth lands in Phase 2.

`frontend/src/store.jsx` — delete `resetDemo` and remove it from the context value.

- [ ] **Step 9: Delete the CSS that only served online orders**

`frontend/src/index.css` — delete these rules and nothing else:

- `.platform-grid` and its media query
- `.platform`, `.platform:hover`, `.platform.on`, `.platform small`, `.pcode`
- `.driver`
- `.queue-big.online`
- `.rc-tag`

- [ ] **Step 10: Verify no remnants and no broken imports**

Run:

```bash
cd frontend && grep -rniE "online|gofood|grabfood|shopeefood|PLATFORMS|DRIVERS|sourceLabel|channel|driver|platform|demo" src/ | grep -v "\.test\.js"
```

Expected: no matches. `store.jsx`'s `demoShort` flag and `OwnerMenu`'s demo toggle are removed in Task 5 — if they are the only remaining hits, proceed and re-run this grep at the end of Task 5.

Then: `cd frontend && npm test && npm run lint && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 11: Commit**

```bash
git add -A frontend/src
git commit -m "refactor(frontend): remove the online-order subsystem"
```

---

### Task 5: OwnerMenu "Semua" chip and demo-toggle removal

**Files:**
- Modify: `frontend/src/selectors.js`
- Modify: `frontend/src/pages/owner/OwnerMenu.jsx`
- Modify: `frontend/src/store.jsx`
- Test: `frontend/src/selectors.menus.test.js`

**Interfaces:**
- Consumes: `sortMenus(list, rank, catOrder)` from `selectors.js`; `menus`, `categories`, `best` from the store.
- Produces: `menusForCategory(menus, catId, rank, catOrder)` in `selectors.js` — returns every menu sorted the POS "Semua" way when `catId` is `'all'`, otherwise only that category's menus sorted by rank then name.

- [ ] **Step 1: Write the failing selector test**

`frontend/src/selectors.menus.test.js`:

```js
import { menusForCategory } from './selectors.js';

const categories = [
  { id: 'paket', name: 'Menu Paket' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'makanan', name: 'Makanan' },
];
const menus = [
  { id: 'm1', name: 'Sop Kikil', cat: 'makanan' },
  { id: 'm2', name: 'Nasi Kikil Mercon', cat: 'makanan' },
  { id: 'd1', name: 'Es Jeruk', cat: 'minuman' },
  { id: 'p1', name: 'Paket Hemat Kikil', cat: 'paket' },
];
const catOrder = new Map(categories.map((c, i) => [c.id, i]));
const rank = new Map([['d1', { id: 'd1', qty: 90, rank: 1 }]]);

test('"all" lists every menu, best sellers first then category order', () => {
  expect(menusForCategory(menus, 'all', rank, catOrder).map((m) => m.id)).toEqual(['d1', 'p1', 'm2', 'm1']);
});

test('a specific category lists only its menus, ranked first', () => {
  expect(menusForCategory(menus, 'makanan', rank, catOrder).map((m) => m.id)).toEqual(['m2', 'm1']);
});

test('menus outside the chip list still appear under "all"', () => {
  const extra = [...menus, { id: 'x1', name: 'Menu Baru', cat: 'baru' }];
  expect(menusForCategory(extra, 'all', rank, catOrder).some((m) => m.id === 'x1')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/selectors.menus.test.js`
Expected: FAIL — `menusForCategory is not a function`.

- [ ] **Step 3: Add the selector**

`frontend/src/selectors.js` — append:

```js
// "Semua" memakai urutan tampilan POS: best seller di atas, lalu urutan kategori, lalu nama.
export function menusForCategory(menus, catId, rank, catOrder) {
  if (catId === 'all') return sortMenus(menus, rank, catOrder);
  return sortMenus(menus.filter((m) => m.cat === catId), rank);
}
```

Note `"a specific category lists only its menus"` expects `['m2','m1']`: within one category neither is ranked, so `sortMenus` falls back to `localeCompare('id')` on names ("Nasi Kikil Mercon" before "Sop Kikil"). That is the mockup's behaviour and the test pins it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/selectors.menus.test.js`
Expected: 3 tests PASS.

- [ ] **Step 5: Add the chip and keep the filter on save**

`frontend/src/pages/owner/OwnerMenu.jsx`:

```jsx
export default function OwnerMenu() {
  const { menus, setMenus, categories, setCategories, best, hasMonthData, dataDays } = useStore();
  const [catId, setCatId] = useState('all');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [catModal, setCatModal] = useState(false);

  const rank = useMemo(() => new Map(best.map((b) => [b.id, b])), [best]);
  const catOrder = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const list = useMemo(() => menusForCategory(menus, catId, rank, catOrder), [menus, catId, rank, catOrder]);
  const defaultCat = catId === 'all' ? categories[0]?.id : catId;

  const save = (menu) => {
    setMenus((prev) => (prev.some((m) => m.id === menu.id) ? prev.map((m) => (m.id === menu.id ? menu : m)) : [...prev, menu]));
    setForm(null);
  };
```

The chips block gains "Semua" first:

```jsx
      <div className="chips scroll">
        <button className={'chip' + (catId === 'all' ? ' active' : '')} onClick={() => setCatId('all')}>
          Semua <span className="chip-n">{menus.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={'chip' + (c.id === catId ? ' active' : '')} onClick={() => setCatId(c.id)}>
            {c.name} <span className="chip-n">{menus.filter((m) => m.cat === c.id).length}</span>
          </button>
        ))}
      </div>
```

The empty state copy becomes `Belum ada menu.` and `MenuForm` receives `defaultCat={defaultCat}`. Inside `MenuForm`, accept the new prop and seed the form's initial category with it:

```jsx
function MenuForm({ menu, categories, defaultCat, onSave, onClose }) {
  const [form, setForm] = useState(() => menu ?? { id: '', name: '', cat: defaultCat, price: 0, emoji: '', image: '' });
```

Keep the rest of `MenuForm` as it is. `defaultCat` takes the place of the old `categories[0]?.id` fallback for a brand-new menu, so "Tambah menu" while "Semua" is selected defaults to the first category and while "Minuman" is selected defaults to Minuman.

- [ ] **Step 6: Remove the demo toggle**

`frontend/src/pages/owner/OwnerMenu.jsx` — delete the `<label className="switch sm">` block with the "Demo: data < 1 bulan" checkbox and the `demoShort`/`setDemoShort` reads. The Best Seller panel keeps the `hasMonthData` branch: the ranked row when true, and when false the existing "Belum ada tanda ★ karena data penjualan belum mencapai 1 bulan ({dataDays} hari terkumpul)." paragraph.

`frontend/src/store.jsx` — delete the `usePersist('demoShort', false)` line and remove `demoShort`, `setDemoShort` from the context value.

- [ ] **Step 7: Verify in the running app**

Run: `cd frontend && npm run dev`
At `http://localhost:5173/pemilik/menu`: "Semua" is selected by default and shows all 21 menus, with the best-seller ★ items pinned on top; opening "Tambah menu" preselects "Menu Paket"; saving keeps "Semua" selected; picking "Minuman" then saving a drink keeps "Minuman" selected.

- [ ] **Step 8: Run the phase gate**

Run:

```bash
cd frontend && npm test && npm run lint && npm run build
grep -rniE "online|gofood|grabfood|shopeefood|PLATFORMS|DRIVERS|sourceLabel|channel|driver|platform|demo|mockup|dummy" src/ | grep -v "\.test\.js"
```

Expected: tests PASS, lint clean, build succeeds, grep returns nothing.

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src
git commit -m "feat(frontend): add the Semua category chip and drop the demo toggle"
```

## Phase 1 exit criteria

- `Buat Pesanan` is the first cashier nav item and only highlights on `/kasir`.
- The cart survives navigation and reload, and clears on payment or "Kosongkan".
- No online-order page, route, nav item, data, selector, CSS rule or copy remains.
- OwnerMenu defaults to "Semua" with a total count, and saving does not change the filter.
- `npm test`, `npm run lint` and `npm run build` pass in `frontend/`.
