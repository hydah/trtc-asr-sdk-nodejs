/**
 * URL query parameter building for the ASR WebSocket request.
 */

export interface SignatureParamsOptions {
  appId: number;
  engineModelType: string;
  voiceId: string;
  voiceFormat?: number;
  needVad?: number;
  convertNumMode?: number;
  hotwordId?: string;
  customizationId?: string;
  filterDirty?: number;
  filterModal?: number;
  filterPunc?: number;
  wordInfo?: number;
  vadSilenceTime?: number;
  maxSpeakTime?: number;
}

/**
 * Holds URL query parameters for the ASR WebSocket request.
 *
 * The "secretid" URL parameter is required by the protocol but internally
 * populated with AppID — users do not need to provide a separate SecretID.
 */
export class SignatureParams {
  readonly appId: number;
  readonly engineModelType: string;
  readonly voiceId: string;
  readonly timestamp: number;
  readonly expired: number;
  readonly nonce: number;
  voiceFormat: number;
  needVad: number;
  convertNumMode: number;
  hotwordId: string;
  customizationId: string;
  filterDirty: number;
  filterModal: number;
  filterPunc: number;
  wordInfo: number;
  vadSilenceTime: number;
  maxSpeakTime: number;

  constructor(opts: SignatureParamsOptions) {
    this.appId = opts.appId;
    this.engineModelType = opts.engineModelType;
    this.voiceId = opts.voiceId;

    const now = Math.floor(Date.now() / 1000);
    this.timestamp = now;
    this.expired = now + 86400;
    this.nonce = Math.floor(Math.random() * 9999999) + 1;

    this.voiceFormat = opts.voiceFormat ?? 1;
    this.needVad = opts.needVad ?? 1;
    this.convertNumMode = opts.convertNumMode ?? 1;
    this.hotwordId = opts.hotwordId ?? "";
    this.customizationId = opts.customizationId ?? "";
    this.filterDirty = opts.filterDirty ?? 0;
    this.filterModal = opts.filterModal ?? 0;
    this.filterPunc = opts.filterPunc ?? 0;
    this.wordInfo = opts.wordInfo ?? 0;
    this.vadSilenceTime = opts.vadSilenceTime ?? 0;
    this.maxSpeakTime = opts.maxSpeakTime ?? 0;
  }

  /** Build URL query string without signature. */
  buildQueryString(): string {
    return encodeParams(this.toMap());
  }

  /** Build URL query string with signature set to the given UserSig. */
  buildQueryStringWithSignature(userSig: string): string {
    const params = this.toMap();
    params["signature"] = userSig;
    return encodeParams(params);
  }

  private toMap(): Record<string, string> {
    const m: Record<string, string> = {
      secretid: String(this.appId),
      timestamp: String(this.timestamp),
      expired: String(this.expired),
      nonce: String(this.nonce),
      engine_model_type: this.engineModelType,
      voice_id: this.voiceId,
      voice_format: String(this.voiceFormat),
      needvad: String(this.needVad),
    };

    if (this.hotwordId) m["hotword_id"] = this.hotwordId;
    if (this.customizationId) m["customization_id"] = this.customizationId;
    if (this.filterDirty) m["filter_dirty"] = String(this.filterDirty);
    if (this.filterModal) m["filter_modal"] = String(this.filterModal);
    if (this.filterPunc) m["filter_punc"] = String(this.filterPunc);
    if (this.convertNumMode) m["convert_num_mode"] = String(this.convertNumMode);
    if (this.wordInfo) m["word_info"] = String(this.wordInfo);
    if (this.vadSilenceTime) m["vad_silence_time"] = String(this.vadSilenceTime);
    if (this.maxSpeakTime) m["max_speak_time"] = String(this.maxSpeakTime);

    return m;
  }
}

function encodeParams(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");
}
