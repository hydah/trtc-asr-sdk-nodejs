/**
 * Credential holds the authentication information for the TRTC-ASR service.
 *
 * Three values are needed:
 * - appId: Tencent Cloud account APPID, from https://console.cloud.tencent.com/cam/capi
 * - sdkAppId: TRTC application ID, from https://console.cloud.tencent.com/trtc/app
 * - secretKey: TRTC SDK secret key, from TRTC console > Application Overview > SDK Key
 */
export class Credential {
  /** Tencent Cloud account APPID. Used in URL path. */
  public readonly appId: number;

  /** TRTC application ID. */
  public readonly sdkAppId: number;

  /** SDK secret key. Used to generate UserSig. Never transmitted. */
  public readonly secretKey: string;

  /** TRTC authentication signature (auto-generated if not set). */
  public userSig: string;

  constructor(appId: number, sdkAppId: number, secretKey: string) {
    this.appId = appId;
    this.sdkAppId = sdkAppId;
    this.secretKey = secretKey;
    this.userSig = "";
  }

  /** Set a pre-computed UserSig. */
  setUserSig(userSig: string): void {
    this.userSig = userSig;
  }
}
