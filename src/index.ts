/**
 * Tencent TRTC Real-time ASR SDK for Node.js.
 */

export { Credential } from "./credential";
export { ASRError, ErrorCode } from "./errors";
export { SignatureParams } from "./signature";
export { genUserSig } from "./usersig";
export {
  SpeechRecognizer,
  SpeechRecognitionListener,
  SpeechRecognitionResponse,
  RecognitionResult,
  WordInfo,
  ENDPOINT,
} from "./speech-recognizer";
