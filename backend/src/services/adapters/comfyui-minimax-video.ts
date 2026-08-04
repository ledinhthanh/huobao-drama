/**
 * ComfyUI MiniMax H3 Video Adapter
 * Server: 10.0.0.124:8188
 * Verified working via /prompt API!
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
} from "./types";

export class ComfyUIMinimaxVideoAdapter implements VideoProviderAdapter {
  provider = "comfyui-minimax";

  buildGenerateRequest(
    config: AIConfig,
    record: VideoGenerationRecord,
  ): ProviderRequest {
    const promptText = record.prompt || "A cat running in the park";
    const seed = Math.floor(Math.random() * 2147483647);
    const { width, height, length } = this.calcParams(
      record.aspectRatio || "16:9",
      record.duration || 5,
    );

    const comfyPrompt = {
      "92": {
        class_type: "SaveVideo",
        inputs: {
          video: ["211", 0],
          filename_prefix: "minimax_h3",
          format: "auto",
          codec: "h264",
        },
      },
      "200": {
        class_type: "VAELoader",
        inputs: { vae_name: "minimax_h3_video_vae_fp16.safetensors" },
      },
      "201": {
        class_type: "VAELoader",
        inputs: { vae_name: "minimax_h3_audio_vae.safetensors" },
      },
      "202": {
        class_type: "VAEDecodeAudio",
        inputs: { vae: ["201", 0], samples: ["206", 0] },
      },
      "203": {
        class_type: "VAEDecode",
        inputs: { vae: ["200", 0], samples: ["206", 0] },
      },
      "204": {
        class_type: "KSamplerSelect",
        inputs: { sampler_name: "euler" },
      },
      "205": {
        class_type: "BasicScheduler",
        inputs: {
          model: ["208", 0],
          scheduler: "normal",
          steps: 30,
          denoise: 1.0,
        },
      },
      "206": {
        class_type: "SamplerCustomAdvanced",
        inputs: {
          noise: ["210", 0],
          guider: ["207", 0],
          sampler: ["204", 0],
          sigmas: ["205", 0],
          latent_image: ["212", 1],
        },
      },
      "207": {
        class_type: "BasicGuider",
        inputs: { model: ["208", 0], conditioning: ["212", 0] },
      },
      "208": {
        class_type: "UNETLoader",
        inputs: {
          unet_name: "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
          weight_dtype: "fp8_e4m3fn",
        },
      },
      "209": {
        class_type: "CLIPLoader",
        inputs: {
          clip_name: "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
          type: "minimax",
        },
      },
      "210": {
        class_type: "RandomNoise",
        inputs: { noise_seed: seed },
      },
      "211": {
        class_type: "CreateVideo",
        inputs: { images: ["203", 0], audio: ["202", 0], fps: 24.0 },
      },
      "212": {
        class_type: "MiniMaxH3ImageToVideo",
        inputs: {
          vae: ["200", 0],
          clip: ["209", 0],
          width: width,
          height: height,
          length: length,
          prompt: promptText,
        },
      },
    };

    return {
      url: `${config.baseUrl}/prompt`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { prompt: comfyPrompt },
    };
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const promptId = result.prompt_id;
    if (promptId) {
      return { isAsync: true, taskId: promptId };
    }
    if (result.error) {
      throw new Error(`ComfyUI: ${JSON.stringify(result.error)}`);
    }
    throw new Error("No prompt_id");
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: `${config.baseUrl}/history/${taskId}`,
      method: "GET",
      headers: {},
      body: undefined,
    };
  }

  parsePollResponse(result: any): VideoPollResponse {
    if (result.status?.completed) {
      const outputs = result.outputs || {};
      for (const nodeId of Object.keys(outputs)) {
        const o = outputs[nodeId];
        if (o?.images?.[0]?.filename) {
          return { status: "completed", videoUrl: o.images[0].filename };
        }
      }
      return { status: "completed" };
    }
    if (result.status?.failed) {
      return {
        status: "failed",
        error: result.status?.error || "Generation failed",
      };
    }
    return { status: "processing" };
  }

  extractVideoUrl(result: any): string | null {
    const outputs = result.outputs || {};
    for (const nodeId of Object.keys(outputs)) {
      const o = outputs[nodeId];
      if (o?.images?.[0]?.filename) {
        return o.images[0].filename;
      }
    }
    return null;
  }

  private calcParams(aspectRatio: string, duration: number) {
    const ratios: Record<string, { width: number; height: number }> = {
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "1:1": { width: 1024, height: 1024 },
      "4:3": { width: 1152, height: 864 },
      "3:4": { width: 864, height: 1152 },
    };
    const { width, height } = ratios[aspectRatio] || ratios["16:9"];
    const length = Math.min(
      362,
      Math.max(124, Math.round((duration * 24) / 17) * 17 + 5),
    );
    return { width, height, length };
  }
}
