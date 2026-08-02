import { JSDOM } from 'jsdom';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Analytics from './src/pages/Analytics.jsx';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.ResizeObserver = class {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ contentRect: { width: 800, height: 400 } }], this);
  }
  unobserve() {}
  disconnect() {}
};
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
globalThis.window.matchMedia = globalThis.matchMedia;
globalThis.MutationObserver = dom.window.MutationObserver;

const SCENARIO = process.env.SCENARIO || 'network';

globalThis.fetch = async () => {
  if (SCENARIO === 'network') throw new TypeError('Failed to fetch');
  if (SCENARIO === '500') {
    return { ok: false, status: 500, text: async () => '{"error":"boom"}' };
  }
  if (SCENARIO === '401') {
    return { ok: false, status: 401, text: async () => '{"error":"unauthorized"}' };
  }
  if (SCENARIO === '500html') {
    return { ok: false, status: 500, text: async () => '<html>Internal Server Error</html>' };
  }
  return { ok: true, status: 200, text: async () => '{}' };
};

process.on('uncaughtException', (err) => {
  console.log(`=== UNCAUGHT EXCEPTION (${SCENARIO}) ===`);
  console.log(err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.log(`=== UNHANDLED REJECTION (${SCENARIO}) ===`);
  console.log(err && err.stack ? err.stack : err);
  process.exit(1);
});

const rootEl = document.getElementById('root');

createRoot(rootEl).render(
  <StrictMode>
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    <MemoryRouter initialEntries={['/analytics/11111111-1111-1111-1111-111111111111']}>
      <Routes>
        <Route path="/analytics/:id" element={<Analytics />} />
      </Routes>
    </MemoryRouter>
  </StrictMode>,
);

setTimeout(() => {
  const html = rootEl.innerHTML;
  console.log(`SCENARIO=${SCENARIO} RENDERED LENGTH:`, html.length);
  console.log('has error card:', html.includes('Could not load analytics'));
  console.log('has analytics-page:', html.includes('analytics-page'));
  process.exit(0);
}, 1200);
