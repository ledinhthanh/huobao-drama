/**
 * ComfyUI Wan Video Adapter
 * Server: 10.0.0.124:8188
 *
 * Wan video generation (có sẵn trong ComfyUI 0.30+)
 * Wan official models: https://huggingface.co/Comfy-Org/Wan2.1
 */
import type {
    AIConfig,
    ProviderRequest,
    VideoGenerationRecord,
    VideoGenResponse,
    VideoPollResponse,
    VideoProviderAdapter,
} from "./types";

export class ComfyUIWanVideoAdapter implements VideoProviderAdapter {
  provider = "comfyui-wan";

  buildGenerateRequest(
    config: AIConfig,
    record: VideoGenerationRecord,
  ): ProviderRequest {
    const prompt = record.prompt || "";
    const resolution = this.calcResolution(record.aspectRatio || "16:9");
    const width = resolution.w;
    const height = resolution.h;
    const seed = Math.floor(Math.random() * 2147483647);

    // Build ComfyUI prompt - Wan T2V workflow
    const comfyPrompt: Record<string, any> = {
      // Load clip
      "1": {
        class_type: "CLIPLoader",
        inputs: {
          clip_name: "umt5_base_fp8_e4m3fn.safetensors",
          type: "wan",
        },
      },
      // Load VAE
      "2": {
        class_type: "VAELoader",
        inputs: {
          vae_name: "Wan2.1_VAE_bf16.safetensors",
        },
      },
      // Empty latent
      "3": {
        class_type: "EmptyLatentImage",
        inputs: {
          width: width,
          height: height,
          batch_size: 1,
        },
      },
      // CLIP text encode
      "4": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: prompt,
          clip: ["1", 0],
        },
      },
      // Negative prompt
      "5": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: "blurry, low quality, distorted",
          clip: ["1", 0],
        },
      },
      // KSampler
      "6": {
        class_type: "KSampler",
        inputs: {
          seed: seed,
          steps: 30,
          cfg: 8,
          sampler_name: "euler",
          scheduler: "normal",
          positive: ["4", 0],
          negative: ["5", 0],
          latent_image: ["3", 0],
        },
      },
      // VAE decode
      "7": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["6", 0],
          vae: ["2", 0],
        },
      },
      // Save image
      "8": {
        class_type: "SaveImage",
        inputs: {
          images: ["7", 0],
          filename_prefix: "wan_test",
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
      throw new Error(`ComfyUI error: ${JSON.stringify(result.error)}`);
    }
    throw new Error("No prompt_id in ComfyUI response");
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
        const nodeOutput = outputs[nodeId];
        if (nodeOutput?.images?.[0]?.filename) {
          return {
            status: "completed",
            videoUrl: nodeOutput.images[0].filename,
          };
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
      const nodeOutput = outputs[nodeId];
      if (nodeOutput?.images?.[0]?.filename) {
        return nodeOutput.images[0].filename;
      }
    }
    return null;
  }

  private calcResolution(aspectRatio: string) {
    const ratios: Record<string, { w: number; h: number }> = {
      "16:9": { w: 1344, h: 768 },
      "9:16": { w: 768, h: 1344 },
      "1:1": { w: 1024, h: 1024 },
      "4:3": { w: 1152, h: 864 },
      "3:4": { w: 864, h: 1152 },
    };
    return ratios[aspectRatio] || ratios["16:9"];
  }
}
