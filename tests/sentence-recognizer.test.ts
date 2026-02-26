import { Credential } from "../src/credential";
import { ASRError, ErrorCode } from "../src/errors";
import {
  SentenceRecognizer,
  SentenceRecognitionRequest,
  SourceType,
} from "../src/sentence-recognizer";

function makeRecognizer(): SentenceRecognizer {
  const credential = new Credential(1300000000, 1400000000, "test-secret");
  return new SentenceRecognizer(credential);
}

describe("SentenceRecognizer", () => {
  // ---- Validation tests ----

  test("recognizeData with empty data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    await expect(
      r.recognizeData(Buffer.alloc(0), "pcm", "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("recognizeData exceeding 3MB should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const data = Buffer.alloc(3 * 1024 * 1024 + 1);
    await expect(
      r.recognizeData(data, "pcm", "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("recognizeURL with empty URL should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    await expect(
      r.recognizeURL("", "wav", "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("recognize with missing engServiceType should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: SentenceRecognitionRequest = {
      engServiceType: "",
      sourceType: SourceType.DATA,
      voiceFormat: "pcm",
      data: "abc",
      dataLen: 3,
    };
    await expect(r.recognize(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("recognize with missing voiceFormat should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: SentenceRecognitionRequest = {
      engServiceType: "16k_zh",
      sourceType: SourceType.DATA,
      voiceFormat: "",
      data: "abc",
      dataLen: 3,
    };
    await expect(r.recognize(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("URL source without url should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: SentenceRecognitionRequest = {
      engServiceType: "16k_zh",
      sourceType: SourceType.URL,
      voiceFormat: "wav",
      url: "",
    };
    await expect(r.recognize(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("DATA source without data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: SentenceRecognitionRequest = {
      engServiceType: "16k_zh",
      sourceType: SourceType.DATA,
      voiceFormat: "pcm",
      data: "",
    };
    await expect(r.recognize(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  // ---- recognizeDataWithOptions test ----

  test("recognizeDataWithOptions with empty data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: SentenceRecognitionRequest = {
      engServiceType: "16k_zh",
      sourceType: SourceType.DATA,
      voiceFormat: "pcm",
      wordInfo: 2,
    };
    await expect(
      r.recognizeDataWithOptions(Buffer.alloc(0), req),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });
});
