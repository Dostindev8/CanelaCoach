/**
 * Cross-platform free of the API listen port before `npm run dev`.
 * Reads PORT from process.env (default 4000). Does not fail the predev hook
 * if the port is already free or kill is denied (permission) — bootstrap still tries listen.
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const port = Number(process.env.PORT || 4000);
const require = createRequire(import.meta.url);
const killPort = require('kill-port');

killPort(port, 'tcp')
  .then(() => {
    console.log(`[predev] puerto ${port} liberado (o ya estaba libre)`);
  })
  .catch((err) => {
    console.warn(
      `[predev] no se pudo liberar :${port} (${err?.message || err}). ` +
        `Si falla el arranque, ejecuta: npm run dev:clean -w backend`
    );
  });
