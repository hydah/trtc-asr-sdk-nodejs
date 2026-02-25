/**
 * Example: Real-time speech recognition with environment variable configuration.
 *
 * Set the following environment variables:
 *
 *   export TRTC_APP_ID="1300403317"
 *   export TRTC_SDK_APP_ID="1400188366"
 *   export TRTC_SECRET_KEY="your-sdk-secret-key"
 *
 * Then run:
 *
 *   npx ts-node examples/realtime-asr-env.ts -f audio.pcm
 */

import * as fs from "fs";
import { parseArgs } from "util";
import {
  Credential,
  SpeechRecognizer,
  SpeechRecognitionListener,
  SpeechRecognitionResponse,
} from "../src";

const ENV_APP_ID = "TRTC_APP_ID";
const ENV_SDK_APP_ID = "TRTC_SDK_APP_ID";
const ENV_SECRET_KEY = "TRTC_SECRET_KEY";

const SLICE_SIZE = 6400;

class ASRListener implements SpeechRecognitionListener {
  constructor(private id: number) {}

  onRecognitionStart(resp: SpeechRecognitionResponse): void {
    console.log(
      `[Worker-${this.id}] Recognition started | voice_id=${resp.voice_id}`,
    );
  }

  onSentenceBegin(resp: SpeechRecognitionResponse): void {
    console.log(
      `[Worker-${this.id}] Sentence begin | index=${resp.result.index}`,
    );
  }

  onRecognitionResultChange(resp: SpeechRecognitionResponse): void {
    console.log(
      `[Worker-${this.id}] Intermediate result | index=${resp.result.index} text="${resp.result.voice_text_str}"`,
    );
  }

  onSentenceEnd(resp: SpeechRecognitionResponse): void {
    console.log(
      `[Worker-${this.id}] Sentence end | index=${resp.result.index} text="${resp.result.voice_text_str}"`,
    );
  }

  onRecognitionComplete(resp: SpeechRecognitionResponse): void {
    console.log(
      `[Worker-${this.id}] Recognition complete | voice_id=${resp.voice_id}`,
    );
  }

  onFail(resp: SpeechRecognitionResponse | null, error: Error): void {
    if (resp) {
      console.error(
        `[Worker-${this.id}] ERROR | voice_id=${resp.voice_id} code=${resp.code} msg=${resp.message} err=${error}`,
      );
    } else {
      console.error(`[Worker-${this.id}] ERROR | err=${error}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processAudio(
  id: number,
  filePath: string,
  appId: number,
  sdkAppId: number,
  secretKey: string,
  engine: string,
): Promise<void> {
  const cred = new Credential(appId, sdkAppId, secretKey);
  const listener = new ASRListener(id);
  const recognizer = new SpeechRecognizer(cred, engine, listener);

  console.log(`[Worker-${id}] Starting recognition...`);
  try {
    await recognizer.start();
  } catch (err) {
    console.error(`[Worker-${id}] Start failed: ${err}`);
    return;
  }

  const fileData = fs.readFileSync(filePath);
  for (let offset = 0; offset < fileData.length; offset += SLICE_SIZE) {
    const chunk = fileData.subarray(offset, offset + SLICE_SIZE);
    try {
      await recognizer.write(Buffer.from(chunk));
    } catch (err) {
      console.error(`[Worker-${id}] Write error: ${err}`);
      break;
    }
    await sleep(200);
  }

  try {
    await recognizer.stop();
  } catch (err) {
    console.error(`[Worker-${id}] Stop error: ${err}`);
  }

  console.log(`[Worker-${id}] Done.`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string", short: "f", default: "test.pcm" },
      engine: { type: "string", short: "e", default: "16k_zh" },
      concurrency: { type: "string", short: "c", default: "1" },
      loop: { type: "boolean", short: "l", default: false },
    },
  });

  const filePath = values.file!;
  const engine = values.engine!;
  const concurrency = parseInt(values.concurrency!, 10);
  const loop = values.loop!;

  const appIdStr = process.env[ENV_APP_ID] || "";
  const sdkAppIdStr = process.env[ENV_SDK_APP_ID] || "";
  const secretKey = process.env[ENV_SECRET_KEY] || "";

  if (!appIdStr || !sdkAppIdStr || !secretKey) {
    console.error(
      `Error: Missing required environment variables.\n\n` +
        `Please set the following environment variables:\n\n` +
        `  export ${ENV_APP_ID}="your-tencent-cloud-appid"\n` +
        `  export ${ENV_SDK_APP_ID}="your-trtc-sdk-app-id"\n` +
        `  export ${ENV_SECRET_KEY}="your-sdk-secret-key"\n\n` +
        `How to obtain:\n` +
        `  1. Get APPID from CAM Console: https://console.cloud.tencent.com/cam/capi\n` +
        `  2. Open TRTC Console:  https://console.cloud.tencent.com/trtc/app\n` +
        `  3. Create or select an application\n` +
        `  4. Copy SDKAppID and SDK secret key from the application overview page\n`,
    );
    process.exit(1);
  }

  const appId = parseInt(appIdStr, 10);
  if (isNaN(appId)) {
    console.error(`Invalid ${ENV_APP_ID}: ${appIdStr} (must be integer)`);
    process.exit(1);
  }

  const sdkAppId = parseInt(sdkAppIdStr, 10);
  if (isNaN(sdkAppId)) {
    console.error(`Invalid ${ENV_SDK_APP_ID}: ${sdkAppIdStr} (must be integer)`);
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(
      `Audio file not found: ${filePath}\n` +
        "Please provide a valid PCM audio file (16kHz, 16bit, mono).",
    );
    process.exit(1);
  }

  do {
    const tasks = Array.from({ length: concurrency }, (_, i) =>
      processAudio(i, filePath, appId, sdkAppId, secretKey, engine),
    );
    await Promise.all(tasks);
    if (loop) await sleep(1000);
  } while (loop);
}

main().catch(console.error);
