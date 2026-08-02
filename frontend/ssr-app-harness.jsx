import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './src/context/AuthContext.jsx';
import App from './src/App.jsx';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/analytics/11111111-1111-1111-1111-111111111111',
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
    this.cb([{ contentRect: { width: 1280, height: 800 } }], this);
  }
  unobserve() {}
  disconnect() {}
};

localStorage.setItem('token', 'fake-token');
localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Test User', email: 't@t.com' }));

const payloadDir = 'C:/Users/tponv/AppData/Local/Temp/opencode/payloads';
const files = fs.readdirSync(payloadDir).filter((f) => f.endsWith('.json'));
let payloadIdx = 0;

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(JSON.parse(fs.readFileSync(path.join(payloadDir, files[payloadIdx]), 'utf8'))),
});

process.on('uncaughtException', (err) => {
  console.log(`=== UNCAUGHT EXCEPTION on ${files[payloadIdx]} ===`);
  console.log(err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.log(`=== UNHANDLED REJECTION on ${files[payloadIdx]} ===`);
  console.log(err && err.stack ? err.stack : err);
  process.exit(1);
});

const rootEl = document.getElementById('root');

function runNext(index) {
  if (index >= files.length) {
    console.log('ALL DONE — no crashes');
    process.exit(0);
  }
  payloadIdx = index;
  rootEl.innerHTML = '';
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AuthProvider>
          <App />
        </AuthProvider>
      </StrictMode>,
    );
  } catch (err) {
    console.log(`=== CRASH on ${files[index]} ===`);
    console.log(err && err.stack ? err.stack : err);
    process.exit(1);
  }
  setTimeout(() => {
    const html = rootEl.innerHTML;
    if (html.includes('analytics-page')) {
      console.log(`OK ${files[index]} length=${html.length}`);
      runNext(index + 1);
    } else {
      console.log(`=== BLANK on ${files[index]} ===`);
      console.log('html length', html.length);
      process.exit(1);
    }
  }, 500);
}

runNext(0);
