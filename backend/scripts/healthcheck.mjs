const port = process.env.PORT || 4000;
const url = `http://127.0.0.1:${port}/api/health`;

try {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[healthcheck] ${url} → HTTP ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log('[healthcheck] ok', body);
  process.exit(0);
} catch (err) {
  console.error(`[healthcheck] ${url} falló:`, err.message);
  process.exit(1);
}
