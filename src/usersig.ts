/**
 * UserSig generation using the official tls-sig-api-v2 library.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TLSSigAPIv2 = require("tls-sig-api-v2");

const DEFAULT_EXPIRE = 86400 * 180; // 180 days in seconds

/**
 * Generate a TRTC UserSig.
 *
 * @param sdkAppId - TRTC application ID
 * @param key - TRTC secret key (from console)
 * @param userId - Unique user identifier (maps to voice_id in ASR)
 * @param expire - Signature validity in seconds (0 uses default 180 days)
 */
export function genUserSig(
  sdkAppId: number,
  key: string,
  userId: string,
  expire: number = 0,
): string {
  if (expire <= 0) {
    expire = DEFAULT_EXPIRE;
  }
  const api = new TLSSigAPIv2.Api(sdkAppId, key);
  return api.genSig(userId, expire);
}
