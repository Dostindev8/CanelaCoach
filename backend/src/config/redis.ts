import { Redis as IoRedis } from 'ioredis';
import { env } from './env.js';

type CacheValue = string;

class MemoryFallback {
  private store = new Map<string, { value: CacheValue; expiresAt?: number }>();
  private lists = new Map<string, string[]>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && typeof ttl === 'number') {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.store.delete(k)) n++;
      if (this.lists.delete(k)) n++;
    }
    return n;
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) || '0') + 1;
    const item = this.store.get(key);
    this.store.set(key, { value: String(current), expiresAt: item?.expiresAt });
    return current;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.unshift(...values);
    this.lists.set(key, list);
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.push(...values);
    this.lists.set(key, list);
    return list.length;
  }

  async brpop(key: string, timeoutSec: number): Promise<[string, string] | null> {
    const deadline = Date.now() + timeoutSec * 1000;
    while (Date.now() < deadline) {
      const list = this.lists.get(key) || [];
      if (list.length > 0) {
        const value = list.pop()!;
        this.lists.set(key, list);
        return [key, value];
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  }

  async llen(key: string): Promise<number> {
    return (this.lists.get(key) || []).length;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter((k) => regex.test(k));
  }

  status = 'ready';
}

type CacheClient = IoRedis | MemoryFallback;

let redisClient: CacheClient;
let usingFallback = false;

let ioRedisInstance: IoRedis | null = null;

export async function connectRedis(): Promise<void> {
  if (!env.redisUrl) {
    redisClient = new MemoryFallback();
    usingFallback = true;
    ioRedisInstance = null;
    console.log('[redis] sin REDIS_URL → fallback Map() en memoria');
    return;
  }

  try {
    const client = new IoRedis(env.redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    await client.connect();
    await client.ping();
    redisClient = client;
    ioRedisInstance = client;
    usingFallback = false;
    console.log('[redis] conectado a Upstash/Redis');
  } catch (err) {
    console.warn('[redis] conexión fallida → fallback Map()', (err as Error).message);
    redisClient = new MemoryFallback();
    ioRedisInstance = null;
    usingFallback = true;
  }
}

/** Quit real Redis client on shutdown (no-op for in-memory fallback). */
export async function disconnectRedis(): Promise<void> {
  if (!ioRedisInstance) return;
  try {
    await ioRedisInstance.quit();
  } catch (err) {
    console.error('[redis] quit:', (err as Error).message);
    try {
      ioRedisInstance.disconnect();
    } catch {
      /* ignore */
    }
  } finally {
    ioRedisInstance = null;
  }
}

export function getCache(): CacheClient {
  if (!redisClient) {
    redisClient = new MemoryFallback();
    usingFallback = true;
  }
  return redisClient;
}

export function isRedisFallback(): boolean {
  return usingFallback;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getCache().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await getCache().set(key, serialized, 'EX', ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await getCache().del(key);
}
