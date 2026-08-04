/**
 * Provider Adapter 注册表
 * 根据 provider 名称返回对应的 Adapter 实例
 */
import { AliImageAdapter } from "./ali-image";
import { AliVideoAdapter } from "./ali-video";
import { ComfyUIMinimaxVideoAdapter } from "./comfyui-minimax-video";
import { ComfyUIWanVideoAdapter } from "./comfyui-wan-video";
import { ComfyUIZImageAdapter } from "./comfyui-zimage";
import { FalMinimaxVideoAdapter } from "./fal-minimax-video";
import { GeminiImageAdapter } from "./gemini-image";
import { MiniMaxImageAdapter } from "./minimax-image";
import { MiniMaxTTSAdapter } from "./minimax-tts";
import { MiniMaxVideoAdapter } from "./minimax-video";
import { OpenAIImageAdapter } from "./openai-image";
import type {
  ImageProviderAdapter,
  TTSProviderAdapter,
  VideoProviderAdapter,
} from "./types";
import { ViduVideoAdapter } from "./vidu-video";
import { VolcEngineImageAdapter } from "./volcengine-image";
import { VolcEngineVideoAdapter } from "./volcengine-video";
import { WanImageAdapter } from "./wan-image";
import { WanVideoAdapter } from "./wan-video";

// 图片 Adapter 注册表
export const imageAdapters: Record<string, ImageProviderAdapter> = {
  minimax: new MiniMaxImageAdapter(),
  openai: new OpenAIImageAdapter(),
  gemini: new GeminiImageAdapter(),
  volcengine: new VolcEngineImageAdapter(),
  ali: new AliImageAdapter(),
  wan: new WanImageAdapter(),
  "comfyui-zimage": new ComfyUIZImageAdapter(),
  // Chatfire - 待确认 API 格式，暂用 OpenAI
  chatfire: new OpenAIImageAdapter(),
};

// 视频 Adapter 注册表
export const videoAdapters: Record<string, VideoProviderAdapter> = {
  minimax: new MiniMaxVideoAdapter(),
  volcengine: new VolcEngineVideoAdapter(),
  vidu: new ViduVideoAdapter(),
  ali: new AliVideoAdapter(),
  wan: new WanVideoAdapter(),
  "fal-minimax": new FalMinimaxVideoAdapter(),
  "comfyui-minimax": new ComfyUIMinimaxVideoAdapter(),
  "comfyui-wan": new ComfyUIWanVideoAdapter(),
  // Chatfire 视频 - 待确认 API 格式
};

// TTS Adapter 注册表
export const ttsAdapters: Record<string, TTSProviderAdapter> = {
  minimax: new MiniMaxTTSAdapter(),
};

export function getTTSAdapter(provider: string): TTSProviderAdapter {
  return ttsAdapters[provider.toLowerCase()] || ttsAdapters["minimax"];
}

/**
 * 获取图片 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter，未知厂商返回 MiniMax 默认
 */
export function getImageAdapter(provider: string): ImageProviderAdapter {
  return imageAdapters[provider.toLowerCase()] || imageAdapters["minimax"];
}

/**
 * 获取视频 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter，未知厂商返回 MiniMax 默认
 */
export function getVideoAdapter(provider: string): VideoProviderAdapter {
  return videoAdapters[provider.toLowerCase()] || videoAdapters["minimax"];
}
