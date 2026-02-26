/**
 * Real-time speech recognition client for TRTC-ASR.
 */

import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { Credential } from "./credential";
import { ASRError, ErrorCode } from "./errors";
import { SignatureParams } from "./signature";
import { genUserSig } from "./usersig";

export const ENDPOINT = "wss://asr.cloud-rtc.com";

enum State {
  IDLE = 0,
  STARTING = 1,
  RUNNING = 2,
  STOPPING = 3,
  STOPPED = 4,
}

/** Word-level recognition details. */
export interface WordInfo {
  word: string;
  start_time: number;
  end_time: number;
  stable_flag: number;
}

/** Speech recognition result details. */
export interface RecognitionResult {
  slice_type: number;
  index: number;
  start_time: number;
  end_time: number;
  voice_text_str: string;
  word_size: number;
  word_list: WordInfo[];
}

/** Response message from the ASR service. */
export interface SpeechRecognitionResponse {
  code: number;
  message: string;
  voice_id: string;
  message_id: string;
  final: number;
  result: RecognitionResult;
}

/** Callback interface for speech recognition events. */
export interface SpeechRecognitionListener {
  onRecognitionStart(response: SpeechRecognitionResponse): void;
  onSentenceBegin(response: SpeechRecognitionResponse): void;
  onRecognitionResultChange(response: SpeechRecognitionResponse): void;
  onSentenceEnd(response: SpeechRecognitionResponse): void;
  onRecognitionComplete(response: SpeechRecognitionResponse): void;
  onFail(response: SpeechRecognitionResponse | null, error: Error): void;
}

/** Real-time speech recognition client using WebSocket. */
export class SpeechRecognizer {
  private credential: Credential;
  private listener: SpeechRecognitionListener;
  private ws: WebSocket | null = null;

  private endpoint = ENDPOINT;
  private engineModelType: string;
  private voiceFormat = 1; // PCM
  private needVad = 1;
  private convertNumMode = 1;
  private hotwordId = "";
  private customizationId = "";
  private filterDirty = 0;
  private filterModal = 0;
  private filterPunc = 0;
  private wordInfo = 0;
  private vadSilenceTime = 0;
  private maxSpeakTime = 0;
  private voiceId = "";
  private writeTimeout = 5000; // ms

  private state: State = State.IDLE;
  private doneResolve: (() => void) | null = null;
  private donePromise: Promise<void> | null = null;

  constructor(
    credential: Credential,
    engineModelType: string,
    listener: SpeechRecognitionListener,
  ) {
    this.credential = credential;
    this.listener = listener;
    this.engineModelType = engineModelType;
  }

  // ---- Configuration setters ----

  setVoiceFormat(format: number): void {
    this.voiceFormat = format;
  }
  setNeedVad(needVad: number): void {
    this.needVad = needVad;
  }
  setConvertNumMode(mode: number): void {
    this.convertNumMode = mode;
  }
  setHotwordId(id: string): void {
    this.hotwordId = id;
  }
  setCustomizationId(id: string): void {
    this.customizationId = id;
  }
  setFilterDirty(mode: number): void {
    this.filterDirty = mode;
  }
  setFilterModal(mode: number): void {
    this.filterModal = mode;
  }
  setFilterPunc(mode: number): void {
    this.filterPunc = mode;
  }
  setWordInfo(mode: number): void {
    this.wordInfo = mode;
  }
  setVadSilenceTime(ms: number): void {
    this.vadSilenceTime = ms;
  }
  setMaxSpeakTime(ms: number): void {
    this.maxSpeakTime = ms;
  }
  setVoiceId(id: string): void {
    this.voiceId = id;
  }
  setWriteTimeout(ms: number): void {
    this.writeTimeout = ms;
  }

  // ---- Core operations ----

  /** Initiate the WebSocket connection and begin the recognition session. */
  start(): Promise<void> {
    if (this.state !== State.IDLE) {
      return Promise.reject(
        new ASRError(ErrorCode.ALREADY_STARTED, "recognizer already started"),
      );
    }

    this.state = State.STARTING;

    return new Promise<void>((resolve, reject) => {
      try {
        this.connect(resolve, reject);
      } catch (err) {
        this.state = State.IDLE;
        reject(
          new ASRError(
            ErrorCode.CONNECT_FAILED,
            `websocket connect failed: ${err}`,
          ),
        );
      }
    });
  }

  /** Send audio data to the ASR service. */
  write(data: Buffer): Promise<void> {
    if (this.state !== State.RUNNING) {
      return Promise.reject(
        new ASRError(ErrorCode.NOT_STARTED, "recognizer not running"),
      );
    }
    if (!this.ws) {
      return Promise.reject(
        new ASRError(ErrorCode.NOT_STARTED, "connection not established"),
      );
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ASRError(ErrorCode.WRITE_FAILED, "write timeout"));
      }, this.writeTimeout);

      this.ws!.send(data, (err) => {
        clearTimeout(timeout);
        if (err) {
          reject(
            new ASRError(
              ErrorCode.WRITE_FAILED,
              `write audio data failed: ${err.message}`,
            ),
          );
        } else {
          resolve();
        }
      });
    });
  }

  /** Gracefully stop the recognition session. */
  async stop(): Promise<void> {
    if (this.state !== State.RUNNING) {
      throw new ASRError(ErrorCode.NOT_STARTED, "recognizer not running");
    }

    this.state = State.STOPPING;

    if (!this.ws) {
      this.state = State.STOPPED;
      throw new ASRError(ErrorCode.NOT_STARTED, "connection not established");
    }

    // Send end signal
    const ws = this.ws;
    try {
      await new Promise<void>((resolve, reject) => {
        const endMsg = JSON.stringify({ type: "end" });
        const timeout = setTimeout(() => {
          reject(new ASRError(ErrorCode.WRITE_FAILED, "send end signal timeout"));
        }, this.writeTimeout);

        ws.send(endMsg, (err) => {
          clearTimeout(timeout);
          if (err) {
            reject(
              new ASRError(
                ErrorCode.WRITE_FAILED,
                `send end signal failed: ${err.message}`,
              ),
            );
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      this.close();
      this.state = State.STOPPED;
      throw err;
    }

    // Wait for read loop to finish (with 10s timeout)
    if (this.donePromise) {
      await Promise.race([
        this.donePromise,
        new Promise<void>((resolve) => setTimeout(resolve, 10000)),
      ]);
    }

    this.close();
    this.state = State.STOPPED;
  }

  // ---- Internal methods ----

  private connect(resolve: () => void, reject: (err: Error) => void): void {
    if (!this.voiceId) {
      this.voiceId = uuidv4();
    }

    // Generate UserSig if not already set
    if (!this.credential.userSig) {
      try {
        this.credential.userSig = genUserSig(
          this.credential.sdkAppId,
          this.credential.secretKey,
          this.voiceId,
          86400,
        );
      } catch (err) {
        this.state = State.IDLE;
        reject(
          new ASRError(
            ErrorCode.AUTH_FAILED,
            `generate user sig failed: ${err}`,
          ),
        );
        return;
      }
    }

    // Build request parameters
    const sigParams = new SignatureParams({
      appId: this.credential.appId,
      engineModelType: this.engineModelType,
      voiceId: this.voiceId,
      voiceFormat: this.voiceFormat,
      needVad: this.needVad,
      convertNumMode: this.convertNumMode,
      hotwordId: this.hotwordId,
      customizationId: this.customizationId,
      filterDirty: this.filterDirty,
      filterModal: this.filterModal,
      filterPunc: this.filterPunc,
      wordInfo: this.wordInfo,
      vadSilenceTime: this.vadSilenceTime,
      maxSpeakTime: this.maxSpeakTime,
    });

    const queryString = sigParams.buildQueryStringWithSignature(
      this.credential.userSig,
    );
    const wsUrl = `${this.endpoint}/asr/v2/${this.credential.appId}?${queryString}`;

    const headers = {
      "X-TRTC-SdkAppId": String(this.credential.sdkAppId),
      "X-TRTC-UserSig": this.credential.userSig,
    };

    this.donePromise = new Promise<void>((res) => {
      this.doneResolve = res;
    });

    this.ws = new WebSocket(wsUrl, {
      headers,
      handshakeTimeout: 10000,
    });

    this.ws.on("open", () => {
      this.state = State.RUNNING;
      resolve();
    });

    this.ws.on("error", (err) => {
      if (this.state === State.STARTING) {
        this.state = State.IDLE;
        reject(
          new ASRError(
            ErrorCode.CONNECT_FAILED,
            `websocket connect failed: ${err.message}`,
          ),
        );
      }
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      this.handleMessage(data);
    });

    this.ws.on("close", () => {
      if (this.state < State.STOPPING) {
        this.listener.onFail(
          null,
          new ASRError(
            ErrorCode.READ_FAILED,
            "websocket connection closed unexpectedly",
          ),
        );
      }
      if (this.doneResolve) {
        this.doneResolve();
        this.doneResolve = null;
      }
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    let text: string;
    if (typeof data === "string") {
      text = data;
    } else if (Buffer.isBuffer(data)) {
      text = data.toString("utf-8");
    } else {
      return;
    }

    let resp: SpeechRecognitionResponse;
    try {
      resp = JSON.parse(text);
    } catch (err) {
      this.listener.onFail(
        null,
        new ASRError(ErrorCode.READ_FAILED, `unmarshal response failed: ${err}`),
      );
      return;
    }

    if (resp.code !== 0) {
      this.listener.onFail(resp, new ASRError(resp.code, resp.message));
      this.close();
      if (this.doneResolve) {
        this.doneResolve();
        this.doneResolve = null;
      }
      return;
    }

    this.dispatchEvent(resp);

    if (resp.final === 1) {
      this.listener.onRecognitionComplete(resp);
      if (this.doneResolve) {
        this.doneResolve();
        this.doneResolve = null;
      }
    }
  }

  private dispatchEvent(resp: SpeechRecognitionResponse): void {
    switch (resp.result?.slice_type) {
      case 0:
        this.listener.onSentenceBegin(resp);
        break;
      case 1:
        this.listener.onRecognitionResultChange(resp);
        break;
      case 2:
        this.listener.onSentenceEnd(resp);
        break;
      default:
        if (resp.final === 1) return;
        this.listener.onRecognitionStart(resp);
        break;
    }
  }

  private close(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
