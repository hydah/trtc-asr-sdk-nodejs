import { Credential } from "../src/credential";
import { ASRError, ErrorCode } from "../src/errors";
import {
  FileRecognizer,
  CreateRecTaskRequest,
  FileSourceType,
} from "../src/file-recognizer";

function makeRecognizer(): FileRecognizer {
  const credential = new Credential(1300000000, 1400000000, "test-secret");
  return new FileRecognizer(credential);
}

describe("FileRecognizer", () => {
  // ---- Validation tests ----

  test("createTaskFromData with empty data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    await expect(
      r.createTaskFromData(Buffer.alloc(0), "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("createTaskFromData exceeding 5MB should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const data = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      r.createTaskFromData(data, "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("createTaskFromURL with empty URL should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    await expect(
      r.createTaskFromURL("", "16k_zh"),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("createTask with missing engineModelType should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: CreateRecTaskRequest = {
      engineModelType: "",
      channelNum: 1,
      resTextFormat: 1,
      sourceType: FileSourceType.DATA,
      data: "abc",
      dataLen: 3,
    };
    await expect(r.createTask(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("URL source without url should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: CreateRecTaskRequest = {
      engineModelType: "16k_zh",
      channelNum: 1,
      resTextFormat: 1,
      sourceType: FileSourceType.URL,
      url: "",
    };
    await expect(r.createTask(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("DATA source without data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: CreateRecTaskRequest = {
      engineModelType: "16k_zh",
      channelNum: 1,
      resTextFormat: 1,
      sourceType: FileSourceType.DATA,
      data: "",
    };
    await expect(r.createTask(req)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARAM,
    });
  });

  test("describeTaskStatus with empty recTaskId should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    await expect(
      r.describeTaskStatus(""),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });

  test("createTaskFromDataWithOptions with empty data should throw INVALID_PARAM", async () => {
    const r = makeRecognizer();
    const req: CreateRecTaskRequest = {
      engineModelType: "16k_zh",
      channelNum: 1,
      resTextFormat: 1,
      sourceType: FileSourceType.DATA,
    };
    await expect(
      r.createTaskFromDataWithOptions(Buffer.alloc(0), req),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAM });
  });
});
