/**
 * Wan 2.2 / Wan 2.5 / Wan 2.6 图片生成 Adapter
 * 兼容阿里云 DashScope 异步任务 API（自部署 VPS 也可复用同套契约）
 *
 * API 文档: https://www.alibabacloud.com/help/en/model-studio/text-to-image-v2-api-reference
 *
 * 支持模型:
 *   - wan2.2-t2i-flash   (Text-to-Image, fast)
 *   - wan2.5-t2i-preview
 *   - wan2.6-t2i
 */
import type { ImageProviderAdapter, ImageGenerationRecord } from './types'
import { joinProviderUrl } from './url'

export class WanImageAdapter implements ImageProviderAdapter {
  readonly provider = 'wan'

  buildGenerateRequest(config: any, record: ImageGenerationRecord): {
    url: string
    method: string
    headers: Record<string, string>
    body: any
  } {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com'
    const url = joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/image-generation/generation')

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    }

    const size = this.normalizeSize(record.size || '1280*1280')

    const body: any = {
      model: record.model || 'wan2.2-t2i-flash',
      input: {
        prompt: record.prompt,
      },
      parameters: {
        size,
        n: 1,
        negative_prompt: '',
        prompt_extend: true,
        watermark: false,
        seed: Math.floor(Math.random() * 2147483647),
      },
    }

    // Reference images (I2I): DashScope 接受 img_urls 数组
    if (record.referenceImages) {
      try {
        const refs = JSON.parse(record.referenceImages)
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
    imageUrl?: string
  } {
    // PENDING 表示异步任务已创建
    if (result.output?.task_status === 'PENDING' && result.output?.task_id) {
      return { isAsync: true, taskId: result.output.task_id }
    }

    // 同步模式: 直接返回图片 URL (choices[0].message.content[0].image)
    if (result.output?.choices?.[0]?.message?.content?.[0]?.image) {
      return {
        isAsync: false,
        imageUrl: result.output.choices[0].message.content[0].image,
      }
    }

    // Wan 2.2 T2I 也可能直接返回 results[].url
    if (result.output?.results?.[0]?.url) {
      return {
        isAsync: false,
        imageUrl: result.output.results[0].url,
      }
    }

    throw new Error(`Unexpected Wan image response: ${JSON.stringify(result).slice(0, 200)}`)
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
    imageUrl?: string
    error?: string
  } {
    const status = result.output?.task_status

    if (status === 'SUCCEEDED') {
      const imageUrl =
        result.output?.choices?.[0]?.message?.content?.[0]?.image ||
        result.output?.results?.[0]?.url ||
        null
      return { status: 'completed', imageUrl }
    }

    if (status === 'FAILED') {
      return { status: 'failed', error: result.message || 'Wan image generation failed' }
    }

    if (status === 'PENDING' || status === 'RUNNING') {
      return { status: 'processing' }
    }

    return { status: 'pending' }
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    return null
  }

  extractImageUrl(result: any): string | null {
    return (
      result.output?.choices?.[0]?.message?.content?.[0]?.image ||
      result.output?.results?.[0]?.url ||
      null
    )
  }

  /**
   * Wan 接受 size 格式 "WxH" or "W*H"; map sang các giá trị mà DashScope hỗ trợ
   */
  private normalizeSize(size: string): string {
    const normalized = size.replace('x', '*').replace('X', '*')
    const [w, h] = normalized.split('*').map(Number)
    if (w && h) {
      const aspect = w / h
      if (aspect > 1.7) return '1664*928'  // ~16:9
      if (aspect < 0.8) return '928*1664'  // 9:16
      return '1328*1328'                   // 1:1
    }
    return '1328*1328'
  }
}
