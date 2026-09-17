import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Tracks issued JWTs in NestJS's built-in cache so they can be revoked
 * on logout (or refresh-token rotation) before they naturally expire.
 *
 * Keys:
 *  - `auth:access:{jti}`  → paired refresh jti
 *  - `auth:refresh:{jti}` → paired access jti
 *
 * A token is valid only while its jti is present in the cache.
 */
@Injectable()
export class TokenStore {
  private static readonly ACCESS_PREFIX = 'auth:access:';
  private static readonly REFRESH_PREFIX = 'auth:refresh:';

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async trackAccessToken(
    accessJti: string,
    refreshJti: string,
    ttlMs: number,
  ): Promise<void> {
    await this.cache.set(
      TokenStore.ACCESS_PREFIX + accessJti,
      refreshJti,
      ttlMs,
    );
  }

  async trackRefreshToken(
    refreshJti: string,
    accessJti: string,
    ttlMs: number,
  ): Promise<void> {
    await this.cache.set(
      TokenStore.REFRESH_PREFIX + refreshJti,
      accessJti,
      ttlMs,
    );
  }

  async isAccessValid(jti: string): Promise<boolean> {
    const value = await this.cache.get<string>(TokenStore.ACCESS_PREFIX + jti);
    return value !== undefined && value !== null;
  }

  async isRefreshValid(jti: string): Promise<boolean> {
    const value = await this.cache.get<string>(TokenStore.REFRESH_PREFIX + jti);
    return value !== undefined && value !== null;
  }

  /** Revokes an access token and its paired refresh token. */
  async revokeAccess(accessJti: string): Promise<void> {
    const refreshJti = await this.cache.get<string>(
      TokenStore.ACCESS_PREFIX + accessJti,
    );
    await this.cache.del(TokenStore.ACCESS_PREFIX + accessJti);
    if (refreshJti) {
      await this.cache.del(TokenStore.REFRESH_PREFIX + refreshJti);
    }
  }

  /** Revokes a refresh token and its paired access token. */
  async revokeRefresh(refreshJti: string): Promise<void> {
    const accessJti = await this.cache.get<string>(
      TokenStore.REFRESH_PREFIX + refreshJti,
    );
    await this.cache.del(TokenStore.REFRESH_PREFIX + refreshJti);
    if (accessJti) {
      await this.cache.del(TokenStore.ACCESS_PREFIX + accessJti);
    }
  }
}
