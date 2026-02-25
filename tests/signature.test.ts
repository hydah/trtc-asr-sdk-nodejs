import { SignatureParams } from "../src/signature";

describe("SignatureParams", () => {
  test("creates with sensible defaults", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });

    expect(params.appId).toBe(1300403317);
    expect(params.engineModelType).toBe("16k_zh");
    expect(params.voiceId).toBe("test-voice-001");
    expect(params.voiceFormat).toBe(1);
    expect(params.needVad).toBe(1);
    expect(params.convertNumMode).toBe(1);
    expect(params.timestamp).toBeGreaterThan(0);
    expect(params.expired).toBe(params.timestamp + 86400);
    expect(params.nonce).toBeGreaterThanOrEqual(1);
    expect(params.nonce).toBeLessThanOrEqual(9999999);
  });

  test("buildQueryString contains required params", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });
    const qs = params.buildQueryString();

    expect(qs).toContain("secretid=1300403317");
    expect(qs).toContain("engine_model_type=16k_zh");
    expect(qs).toContain("voice_id=test-voice-001");
    expect(qs).toContain("voice_format=1");
    expect(qs).toContain("needvad=1");
    expect(qs).not.toContain("signature");
  });

  test("buildQueryStringWithSignature includes signature", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });
    const userSig = "eJyrVgrxCdYrLkksyczPs1KyUkqpTM4sSgUAR94HgQ--";
    const qs = params.buildQueryStringWithSignature(userSig);

    expect(qs).toContain("signature=");
    expect(qs).toContain("secretid=1300403317");
  });

  test("query string keys are sorted", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });
    const qs = params.buildQueryString();
    const keys = qs.split("&").map((p) => p.split("=")[0]);

    expect(keys).toEqual([...keys].sort());
  });

  test("optional params omitted when zero/empty", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });
    const qs = params.buildQueryString();

    expect(qs).not.toContain("hotword_id");
    expect(qs).not.toContain("customization_id");
    expect(qs).not.toContain("filter_dirty");
    expect(qs).not.toContain("word_info");
    expect(qs).not.toContain("vad_silence_time");
    expect(qs).not.toContain("max_speak_time");
  });

  test("optional params included when set", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
      hotwordId: "hw-001",
      filterDirty: 1,
      wordInfo: 1,
      vadSilenceTime: 500,
    });
    const qs = params.buildQueryString();

    expect(qs).toContain("hotword_id=hw-001");
    expect(qs).toContain("filter_dirty=1");
    expect(qs).toContain("word_info=1");
    expect(qs).toContain("vad_silence_time=500");
  });

  test("secret key never appears in query", () => {
    const params = new SignatureParams({
      appId: 1300403317,
      engineModelType: "16k_zh",
      voiceId: "test-voice-001",
    });
    const qs = params.buildQueryStringWithSignature("fake-user-sig");

    expect(qs.toLowerCase()).not.toContain("secret_key");
    expect(qs.toLowerCase()).not.toContain("secretkey");
  });
});
