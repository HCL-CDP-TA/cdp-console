import { hashPassword } from "./auth"

interface CachedToken {
  token: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()

/** Returns the Core API access token for a tenant, or null if not configured. */
export async function getTenantCoreApiToken(tenantId: string): Promise<string | null> {
  const username = process.env[`CORE_API_TENANT_${tenantId}_USERNAME`]
  const password = process.env[`CORE_API_TENANT_${tenantId}_PASSWORD`]
  if (!username || !password) return null

  const cached = tokenCache.get(tenantId)
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token
  }

  // Cache miss — fetch a new token
  const hashedPassword = await hashPassword(password)
  const formData = new URLSearchParams({
    username,
    password: hashedPassword,
    grant_type: "password",
    client_id: "client_id",
    client_secret: "client_secret",
  })

  const response = await fetch(`${process.env.CORE_API_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  })

  if (!response.ok) return null

  const data = await response.json()
  tokenCache.set(tenantId, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  })
  return data.access_token
}

/** Returns true if this tenant has service account credentials configured. */
export function isTenantCoreApiConfigured(tenantId: string): boolean {
  return !!(
    process.env[`CORE_API_TENANT_${tenantId}_USERNAME`] &&
    process.env[`CORE_API_TENANT_${tenantId}_PASSWORD`]
  )
}

/** Force-expire a tenant's cached token (e.g., after a 401 on a Core API call). */
export function invalidateTenantCoreApiToken(tenantId: string): void {
  tokenCache.delete(tenantId)
}
