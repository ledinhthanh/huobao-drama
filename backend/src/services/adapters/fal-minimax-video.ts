/**
 * fal.ai MiniMax H3 Video Adapter
 * API: fal.ai/minimax-h3
 * Queue API: queue.fal.run
 *
 * Endpoints:
 *   - POST /minimax/h3/text-to-video
 *   - GET  /minimax/h3/text-to-video/requests/{request_id}/status
 *   - GET  /minimax/h3/text-to-video/requests/{request_id}
 *
 * Reference: https://fal.ai/models/minimax/h3/text-to-video/api
 */
import type {
    AIConfig,
    ProviderRequest,
    VideoGenerationRecord,
    VideoGenResponse,
    VideoPollResponse,
    VideoProviderAdapter,
} from "./types";
import { joinProviderUrl } from "./url";

// fal.ai queue API base URL
const FAL_QUEUE_BASE = "https://queue.fal.run";

export class FalMinimaxVideoAdapter implements VideoProviderAdapter {
  provider = "fal-minimax";

  buildGenerateRequest(
    config: AIConfig,
    record: VideoGenerationRecord,
  ): ProviderRequest {
    let endpoint = "/minimax/h3/text-to-video";
    const input: Record<string, any> = {
      prompt: record.prompt || "",
      duration: Math.min(15, Math.max(5, record.duration || 5)),
      resolution: "2K",
    };

    if (record.referenceMode === "single" && record.imageUrl) {
      endpoint = "/minimax/h3/image-to-video";
      input.image_url = record.imageUrl;
    } else if (record.referenceMode === "first_last") {
      endpoint = "/minimax/h3/image-to-video";
      if (record.firstFrameUrl) {
        input.first_frame_image_url = record.firstFrameUrl;
      }
      if (record.lastFrameUrl) {
        input.last_frame_image_url = record.lastFrameUrl;
      }
    } else if (
      record.referenceMode === "multiple" &&
      record.referenceImageUrls
    ) {
      endpoint = "/minimax/h3/reference-to-video";
      try {
        const refs = JSON.parse(record.referenceImageUrls);
        input.reference_image_urls = refs.slice(0, 9); // Max 9 reference images
      } catch {}
    }

    // Aspect ratio
    if (record.aspectRatio) {
      input.aspect_ratio = this.normalizeAspectRatio(record.aspectRatio);
    }

    return {
      url: joinProviderUrl(FAL_QUEUE_BASE, "", endpoint),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: input,
    };
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    // fal.ai queue API returns { status, request_id, response_url, status_url }
    const requestId = result.request_id || result.id;
    const status = result.status;

    // If completed immediately (unlikely but possible)
    if (status === "COMPLETED" || result.video) {
      const videoUrl = result.video?.url || result.content?.video?.url;
      if (videoUrl) {
        return { isAsync: false, videoUrl };
      }
    }

    if (requestId) {
      return { isAsync: true, taskId: requestId };
    }

    throw new Error("No request_id in fal.ai queue response");
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    // Status endpoint: GET /minimax/h3/text-to-video/requests/{request_id}/status
    return {
      url: joinProviderUrl(
        FAL_QUEUE_BASE,
        "",
        `/minimax/h3/text-to-video/requests/${taskId}/status`,
      ),
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: undefined,
    };
  }

  buildResultRequest(config: AIConfig, taskId: string): ProviderRequest {
    // Result endpoint: GET /minimax/h3/text-to-video/requests/{request_id}
    return {
      url: joinProviderUrl(
        FAL_QUEUE_BASE,
        "",
        `/minimax/h3/text-to-video/requests/${taskId}`,
      ),
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: undefined,
    };
  }

  parsePollResponse(result: any): VideoPollResponse {
    const status = result.status?.toUpperCase();

    // Check for completed status
    if (status === "COMPLETED") {
      // Video is in the result, not in status response
      // We need to call the result endpoint to get the video URL
      return {
        status: "completed",
        videoUrl: undefined, // Will be fetched from result endpoint
      };
    }

    // Check for failed status
    if (status === "FAILED" || status === "ERROR") {
      return {
        status: "failed",
        error: result.error || "Video generation failed",
      };
    }

    // Still processing
    return { status: "processing" };
  }

  parseResultResponse(result: any): VideoPollResponse {
    // Result response contains the actual video
    if (result.video) {
      return {
        status: "completed",
        videoUrl: result.video.url,
      };
    }

    if (result.error) {
      return {
        status: "failed",
        error: result.error,
      };
    }

    return { status: "processing" };
  }

  extractVideoUrl(result: any): string | null {
    return result.video?.url || null;
  }

  private normalizeAspectRatio(aspectRatio: string): string {
    const ratioMap: Record<string, string> = {
      "16:9": "16:9",
      "9:16": "9:16",
      "1:1": "1:1",
      "4:3": "4:3",
      "3:4": "3:4",
      "21:9": "21:9",
    };
    return ratioMap[aspectRatio] || "16:9";
  }
}
