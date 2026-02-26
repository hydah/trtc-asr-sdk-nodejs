/**
 * Tencent TRTC ASR SDK for Node.js.
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
export {
  SentenceRecognizer,
  SentenceRecognitionRequest,
  SentenceRecognitionResult,
  SentenceWord,
  SourceType,
  SENTENCE_ENDPOINT,
} from "./sentence-recognizer";
export {
  FileRecognizer,
  CreateRecTaskRequest,
  TaskStatus,
  SentenceDetail,
  SentenceWords,
  FileSourceType,
  TaskStatusCode,
  FILE_ENDPOINT,
} from "./file-recognizer";
