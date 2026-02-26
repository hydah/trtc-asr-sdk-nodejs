# TRTC-ASR Node.js SDK

基于 TRTC 鉴权体系的实时语音识别（ASR）Node.js SDK，通过 WebSocket 协议与 ASR 服务通信。

## 安装

```bash
npm install trtc-asr
```

**要求**：Node.js >= 16

## 快速开始

```typescript
import { Credential, SpeechRecognizer, SpeechRecognitionListener, SpeechRecognitionResponse } from "trtc-asr";
import * as fs from "fs";

// 实现回调接口
const listener: SpeechRecognitionListener = {
  onRecognitionStart(resp: SpeechRecognitionResponse) {
    console.log(`Recognition started, voice_id: ${resp.voice_id}`);
  },
  onSentenceBegin(resp: SpeechRecognitionResponse) {
    console.log(`Sentence begin, index: ${resp.result.index}`);
  },
  onRecognitionResultChange(resp: SpeechRecognitionResponse) {
    console.log(`Result: ${resp.result.voice_text_str}`);
  },
  onSentenceEnd(resp: SpeechRecognitionResponse) {
    console.log(`Sentence end: ${resp.result.voice_text_str}`);
  },
  onRecognitionComplete(resp: SpeechRecognitionResponse) {
    console.log(`Complete, voice_id: ${resp.voice_id}`);
  },
  onFail(resp: SpeechRecognitionResponse | null, error: Error) {
    console.error(`Failed: ${error}`);
  },
};

async function main() {
  // 1. 创建凭证
  const credential = new Credential(
    1300403317,              // 腾讯云 APPID
    1400188366,              // TRTC SDKAppID
    "your-sdk-secret-key",   // SDK密钥
  );

  // 2. 创建识别器
  const recognizer = new SpeechRecognizer(credential, "16k_zh", listener);

  // 3. 可选配置
  // recognizer.setHotwordId("hotword-id");     // 设置热词
  // recognizer.setVadSilenceTime(500);          // VAD 静音时间

  // 4. 启动识别
  await recognizer.start();

  // 5. 发送音频数据
  const fileData = fs.readFileSync("audio.pcm");
  const SLICE_SIZE = 6400; // 200ms of 16kHz 16bit mono PCM
  for (let offset = 0; offset < fileData.length; offset += SLICE_SIZE) {
    const chunk = fileData.subarray(offset, offset + SLICE_SIZE);
    await recognizer.write(Buffer.from(chunk));
    await new Promise((resolve) => setTimeout(resolve, 200)); // 模拟实时
  }

  // 6. 停止识别
  await recognizer.stop();
}

main().catch(console.error);
```

## 前提条件

使用本 SDK 前，您需要：

1. **获取腾讯云 APPID** — 在 [CAM API 密钥管理](https://console.cloud.tencent.com/cam/capi) 页面查看
2. **创建 TRTC 应用** — 在 [实时音视频控制台](https://console.cloud.tencent.com/trtc/app) 创建应用，获取 `SDKAppID`
3. **获取 SDK 密钥** — 在应用概览页点击「SDK密钥」查看密钥，即用于计算 UserSig 的加密密钥

## 凭证获取

| 参数 | 来源 | 说明 |
|------|------|------|
| `appId` | [CAM 密钥管理](https://console.cloud.tencent.com/cam/capi) | 腾讯云账号 APPID，用于 URL 路径 |
| `sdkAppId` | [TRTC 控制台](https://console.cloud.tencent.com/trtc/app) > 应用管理 | TRTC 应用 ID |
| `secretKey` | [TRTC 控制台](https://console.cloud.tencent.com/trtc/app) > 应用概览 > SDK密钥 | 用于生成 UserSig，不会传输到网络 |

## 配置项

| 方法 | 说明 | 默认值 |
|------|------|--------|
| `setVoiceFormat(f)` | 音频格式 | 1 (PCM) |
| `setNeedVad(v)` | 是否开启 VAD | 1 (开启) |
| `setConvertNumMode(m)` | 数字转换模式 | 1 (智能) |
| `setHotwordId(id)` | 热词表 ID | - |
| `setCustomizationId(id)` | 自学习模型 ID | - |
| `setFilterDirty(m)` | 脏词过滤 | 0 (关闭) |
| `setFilterModal(m)` | 语气词过滤 | 0 (关闭) |
| `setFilterPunc(m)` | 句号过滤 | 0 (关闭) |
| `setWordInfo(m)` | 词级时间 | 0 (关闭) |
| `setVadSilenceTime(ms)` | VAD 静音阈值 | 1000ms |
| `setMaxSpeakTime(ms)` | 强制断句时间 | 60000ms |
| `setVoiceId(id)` | 自定义 voice_id | 自动 UUID |

## 引擎模型

| 类型 | 说明 |
|------|------|
| `8k_zh` | 中文通用，常用于电话场景 |
| `16k_zh` | 中文通用（推荐） |
| `16k_zh_en` | 中英文通用 |

## 示例

完整示例请参见 [`examples/realtime-asr.ts`](./examples/realtime-asr.ts)。

运行示例：

```bash
git clone https://github.com/hydah/trtc-asr-sdk-nodejs.git
cd trtc-asr-sdk-nodejs
npm install

npx ts-node examples/realtime-asr.ts -f test.pcm
```

## 项目结构

```
trtc-asr-sdk-nodejs/
├── src/                            # TypeScript 源码
│   ├── index.ts                    # 包入口，统一导出
│   ├── credential.ts               # 凭证管理（APPID + SDKAppID + SDK密钥）
│   ├── usersig.ts                  # TRTC UserSig 生成
│   ├── signature.ts                # URL 请求参数构建
│   ├── speech-recognizer.ts        # 实时语音识别器
│   └── errors.ts                   # 错误定义
├── examples/                       # 示例代码
│   └── realtime-asr.ts             # 实时语音识别示例
├── tests/                          # 测试
│   ├── signature.test.ts           # 签名参数测试
│   └── recognizer.lifecycle.test.ts # 生命周期健壮性测试
├── dist/                           # 编译输出（npm 发布内容）
├── package.json                    # 包定义
├── tsconfig.json                   # TypeScript 配置
└── .gitignore
```

## 常见问题

### APPID 和 SDKAppID 有什么区别？

- **APPID**（如 `1300403317`）：腾讯云账号级别的 ID，从 [CAM 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取，用于 WebSocket URL 路径
- **SDKAppID**（如 `1400188366`）：TRTC 应用级别的 ID，从 [TRTC 控制台](https://console.cloud.tencent.com/trtc/app) 获取，用于 Header 鉴权

### UserSig 是什么？

UserSig 是基于 SDKAppID 和 SDK 密钥计算的签名，用于 TRTC 服务鉴权。SDK 会自动生成，无需手动计算。详见[鉴权文档](https://cloud.tencent.com/document/product/647/17275)。

### 支持哪些音频格式？

当前支持 PCM 格式（`voiceFormat=1`），建议使用 16kHz、16bit、单声道的 PCM 音频。

### TypeScript 和 JavaScript 都能用吗？

可以。SDK 使用 TypeScript 编写，编译后发布包含 `.js` 和 `.d.ts` 文件，TypeScript 和 JavaScript 项目均可使用。

## License

MIT License
