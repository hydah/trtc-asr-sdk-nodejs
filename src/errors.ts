/**
 * Error codes for the TRTC-ASR SDK.
 */
export const ErrorCode = {
  INVALID_PARAM: 1001,
  CONNECT_FAILED: 1002,
  WRITE_FAILED: 1003,
  READ_FAILED: 1004,
  AUTH_FAILED: 1005,
  TIMEOUT: 1006,
  SERVER_ERROR: 1007,
  ALREADY_STARTED: 1008,
  NOT_STARTED: 1009,
  ALREADY_STOPPED: 1010,
} as const;

/**
 * Error type for TRTC-ASR service or SDK errors.
 */
export class ASRError extends Error {
  public readonly code: number;

  constructor(code: number, message: string) {
    super(`trtc-asr error [${code}]: ${message}`);
    this.code = code;
    this.name = "ASRError";
  }
}
