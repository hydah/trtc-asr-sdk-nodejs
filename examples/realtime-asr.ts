/**
 * Basic example: Real-time speech recognition with hardcoded credentials.
 *
 * Usage:
 *   npx ts-node examples/realtime-asr.ts -f test.pcm
 *   node examples/realtime-asr.js -f test.pcm -e 16k_zh -c 2
 *
 * Prerequisites:
 *   1. Get Tencent Cloud APPID: https://console.cloud.tencent.com/cam/capi
 *   2. Create a TRTC application: https://console.cloud.tencent.com/trtc/app
 *   3. Get SDKAppID and SDK secret key from the application overview page
 *   4. Prepare a PCM audio file (16kHz, 16bit, mono)
 */

import * as fs from "fs";
import { parseArgs } from "util";
import {
  Credential,
  SpeechRecognizer,
  SpeechRecognitionListener,
  SpeechRecognitionResponse,
} from "../src";

// ===== Configuration =====
// Fill in your credentials before running.
const APP_ID = 0; // Tencent Cloud APPID
const SDK_APP_ID = 0; // TRTC application ID (e.g., 1400188366)
const SECRET_KEY = ""; // TRTC SDK secret key

const SLICE_SIZE = 6400; // bytes per audio chunk (200ms for 16kHz 16bit mono PCM)

class MyListener implements SpeechRecognitionListener {
  constructor(private id: number) {}

  onRecognitionStart(resp: SpeechRecognitionResponse): void {
    console.log(`[${this.id}] Recognition started, voice_id: ${resp.voice_id}`);
  }

  onSentenceBegin(resp: SpeechRecognitionResponse): void {
    console.log(`[${this.id}] Sentence begin, index: ${resp.result.index}`);
  }

  onRecognitionResultChange(resp: SpeechRecognitionResponse): void {
    console.log(
      `[${this.id}] Result change, index: ${resp.result.index}, text: ${resp.result.voice_text_str}`,
    );
  }

  onSentenceEnd(resp: SpeechRecognitionResponse): void {
    console.log(
      `[${this.id}] Sentence end, index: ${resp.result.index}, text: ${resp.result.voice_text_str}`,
    );
  }

  onRecognitionComplete(resp: SpeechRecognitionResponse): void {
    console.log(
      `[${this.id}] Recognition complete, voice_id: ${resp.voice_id}`,
    );
  }

  onFail(resp: SpeechRecognitionResponse | null, error: Error): void {
    if (resp) {
      console.error(
        `[${this.id}] Failed, voice_id: ${resp.voice_id}, error: ${error}`,
      );
    } else {
      console.error(`[${this.id}] Failed, error: ${error}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processAudio(
  id: number,
  filePath: string,
  engine: string,
): Promise<void> {
  const credential = new Credential(APP_ID, SDK_APP_ID, SECRET_KEY);
  const listener = new MyListener(id);
  const recognizer = new SpeechRecognizer(credential, engine, listener);

  try {
    await recognizer.start();
  } catch (err) {
    console.error(`[${id}] Start failed: ${err}`);
    return;
  }

  const fileData = fs.readFileSync(filePath);
  for (let offset = 0; offset < fileData.length; offset += SLICE_SIZE) {
    const chunk = fileData.subarray(offset, offset + SLICE_SIZE);
    try {
      await recognizer.write(Buffer.from(chunk));
    } catch (err) {
      console.error(`[${id}] Write error: ${err}`);
      break;
    }
    await sleep(200);
  }

  try {
    await recognizer.stop();
  } catch (err) {
    console.error(`[${id}] Stop error: ${err}`);
  }

  console.log(`[${id}] Processing complete.`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string", short: "f", default: "test.pcm" },
      engine: { type: "string", short: "e", default: "16k_zh_en" },
      concurrency: { type: "string", short: "c", default: "1" },
      loop: { type: "boolean", short: "l", default: false },
    },
  });

  const filePath = values.file!;
  const engine = values.engine!;
  const concurrency = parseInt(values.concurrency!, 10);
  const loop = values.loop!;

  if (!APP_ID || !SDK_APP_ID || !SECRET_KEY) {
    console.error(
      "Error: Please set APP_ID, SDK_APP_ID and SECRET_KEY in the code.\n\n" +
        "Steps:\n" +
        "  1. Get APPID from CAM Console: https://console.cloud.tencent.com/cam/capi\n" +
        "  2. Open TRTC Console: https://console.cloud.tencent.com/trtc/app\n" +
        "  3. Create or select an application\n" +
        "  4. Copy SDKAppID and SDK secret key from the application overview\n" +
        "  5. Fill in the credentials at the top of this file.\n",
    );
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(
      `Error: Audio file not found: ${filePath}\n` +
        "Please provide a valid PCM audio file (16kHz, 16bit, mono).",
    );
    process.exit(1);
  }

  do {
    const tasks = Array.from({ length: concurrency }, (_, i) =>
      processAudio(i, filePath, engine),
    );
    await Promise.all(tasks);
    if (loop) await sleep(1000);
  } while (loop);
}

main().catch(console.error);
