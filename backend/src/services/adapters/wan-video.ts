/**
 * Wan 2.2 / Wan 2.5 / Wan 2.6 视频生成 Adapter
 * 兼容阿里云 DashScope 异步任务 API（自部署 VPS 也可复用同套契约）
 *
 * API 文档: https://www.alibabacloud.com/help/en/model-studio/text-to-video-v2-api-reference
 *           https://www.alibabacloud.com/help/en/model-studio/image-to-video-api-reference
 *
 * 支持模型:
 *   - wan2.2-t2v-plus   (Text-to-Video, 720P, 5s)
 *   - wan2.2-i2v-plus   (Image-to-Video, 480P/720P, 5s)
 *   - wan2.5-i2v-preview (Image-to-Video with audio, 5/10s)
 *   - wan2.6-t2v        (Text-to-Video)
 *   - wan2.7-t2v        (Text-to-Video, latest)
 */
import type { VideoProviderAdapter, VideoGenerationRecord } from './types'
import { joinProviderUrl } from './url'

export class WanVideoAdapter implements VideoProviderAdapter {
  readonly provider = 'wan'

  buildGenerateRequest(config: any, record: VideoGenerationRecord): {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  } {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com'
    const url = joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/video-generation/video-synthesis')

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    }

    // 根据是否有参考图自动选 T2V 或 I2V 模型
    const hasImage = record.imageUrl || record.firstFrameUrl || record.lastFrameUrl
    const defaultModel = hasImage ? 'wan2.2-i2v-plus' : 'wan2.2-t2v-plus'

    const body: any = {
      model: record.model || defaultModel,
      input: {
        prompt: record.prompt,
      },
      parameters: {
        resolution: this.normalizeResolution(record.aspectRatio ?? '16:9'),
        duration: record.duration || 5,
        watermark: false,
        seed: Math.floor(Math.random() * 2147483647),
      },
    }

    // I2V: 注入参考图 (img_url). DashScope 接受 lastFrame 用 last_img_url.
    if (record.firstFrameUrl) {
      body.input.img_url = record.firstFrameUrl as string
    } else if (record.imageUrl) {
      body.input.img_url = record.imageUrl as string
    }

    if (record.lastFrameUrl) {
      body.input.last_img_url = record.lastFrameUrl as string
    }

    // 多参考模式 (multi_ref): 仅在 self-hosted 部署上支持，DashScope 不支持
    // 这里透传数组，自部署 server 自己解析
    if (record.referenceImageUrls) {
      try {
        const refs = JSON.parse(record.referenceImageUrls)
        if (Array.isArray(refs) && refs.length) {
          body.input.reference_images = refs
        }
      } catch {
        // ignore parse errors
      }
    }

    return { url, method: 'POST', headers, body }
  }

  parseGenerateResponse(result: any): {
    isAsync: boolean
    taskId?: string
    videoUrl?: string
  } {
    if (result.output?.task_status === 'PENDING' && result.output?.task_id) {
      return { isAsync: true, taskId: result.output.task_id }
    }

    if (result.output?.video_url) {
      return { isAsync: false, videoUrl: result.output.video_url }
    }

    throw new Error(`Unexpected Wan video response: ${JSON.stringify(result).slice(0, 200)}`)
  }

  buildPollRequest(config: any, taskId: string): {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  } {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com'
    return {
      url: joinProviderUrl(baseUrl, '/api/v1', `/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    videoUrl?: string
    error?: string
  } {
    const status = result.output?.task_status

    if (status === 'SUCCEEDED') {
      return { status: 'completed', videoUrl: result.output?.video_url }
    }

    if (status === 'FAILED') {
      return { status: 'failed', error: result.message || 'Wan video generation failed' }
    }

    if (status === 'PENDING' || status === 'RUNNING') {
      return { status: 'processing' }
    }

    return { status: 'pending' }
  }

  extractVideoUrl(result: any): string | null {
    return result.output?.video_url || null
  }

  private normalizeResolution(aspectRatio?: string): string {
    const ratio = aspectRatio || '16:9'
    if (ratio === '9:16') return '720P'
    if (ratio === '1:1') return '720P'
    return '1080P'
  }
}
