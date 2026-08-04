/**
 * Test script để verify fal-minimax adapter hoạt động đúng
 */
import { FalMinimaxVideoAdapter } from '../src/services/adapters/fal-minimax-video.js'
import type { AIConfig, VideoGenerationRecord } from '../src/services/adapters/types.js'

const adapter = new FalMinimaxVideoAdapter()

const config: AIConfig = {
  provider: 'fal-minimax',
  baseUrl: 'https://fal.ai',
  apiKey: process.env.FAL_API_KEY || 'YOUR_FAL_API_KEY',
  model: 'minimax/h3/text-to-video',
}

console.log('🧪 Testing FalMinimaxVideoAdapter\n')

// Test 1: Text-to-Video
console.log('Test 1: Text-to-Video')
const t2vRecord: VideoGenerationRecord = {
  id: 1,
  prompt: 'A beautiful sunset over the ocean with dolphins jumping',
  duration: 5,
  aspectRatio: '16:9',
}
const t2vRequest = adapter.buildGenerateRequest(config, t2vRecord)
console.log('URL:', t2vRequest.url)
console.log('Method:', t2vRequest.method)
console.log('Body:', JSON.stringify(t2vRequest.body, null, 2))
console.log()

// Test 2: Image-to-Video (single reference)
console.log('Test 2: Image-to-Video (single reference)')
const i2vRecord: VideoGenerationRecord = {
  id: 2,
  prompt: 'The character walks through a magical forest',
  referenceMode: 'single',
  imageUrl: 'https://example.com/reference.jpg',
  duration: 10,
  aspectRatio: '16:9',
}
const i2vRequest = adapter.buildGenerateRequest(config, i2vRecord)
console.log('URL:', i2vRequest.url)
console.log('Body:', JSON.stringify(i2vRequest.body, null, 2))
console.log()

// Test 3: First/Last Frame
console.log('Test 3: First/Last Frame')
const flRecord: VideoGenerationRecord = {
  id: 3,
  prompt: 'Smooth transition from day to night',
  referenceMode: 'first_last',
  firstFrameUrl: 'https://example.com/first.jpg',
  lastFrameUrl: 'https://example.com/last.jpg',
  duration: 15,
  aspectRatio: '9:16',
}
const flRequest = adapter.buildGenerateRequest(config, flRecord)
console.log('URL:', flRequest.url)
console.log('Body:', JSON.stringify(flRequest.body, null, 2))
console.log()

// Test 4: Reference-to-Video (multiple references)
console.log('Test 4: Reference-to-Video (multiple references)')
const r2vRecord: VideoGenerationRecord = {
  id: 4,
  prompt: 'Character maintains identity from reference images',
  referenceMode: 'multiple',
  referenceImageUrls: JSON.stringify([
    'https://example.com/ref1.jpg',
    'https://example.com/ref2.jpg',
    'https://example.com/ref3.jpg',
  ]),
  duration: 10,
  aspectRatio: '16:9',
}
const r2vRequest = adapter.buildGenerateRequest(config, r2vRecord)
console.log('URL:', r2vRequest.url)
console.log('Body:', JSON.stringify(r2vRequest.body, null, 2))
console.log()

// Test 5: Poll Request
console.log('Test 5: Poll Request')
const pollRequest = adapter.buildPollRequest(config, 'test-task-id-123')
console.log('URL:', pollRequest.url)
console.log('Method:', pollRequest.method)
console.log()

// Test 6: Parse Response
console.log('Test 6: Parse Response (async)')
const asyncResponse = { request_id: 'abc-123-def' }
const parsed1 = adapter.parseGenerateResponse(asyncResponse)
console.log('Parsed:', parsed1)
console.log()

console.log('Test 7: Parse Response (sync)')
const syncResponse = { video: { url: 'https://example.com/video.mp4' } }
const parsed2 = adapter.parseGenerateResponse(syncResponse)
console.log('Parsed:', parsed2)
console.log()

console.log('Test 8: Parse Poll Response (completed)')
const pollCompleted = {
  status: 'completed',
  video: { url: 'https://example.com/result.mp4' }
}
const pollParsed1 = adapter.parsePollResponse(pollCompleted)
console.log('Parsed:', pollParsed1)
console.log()

console.log('Test 9: Parse Poll Response (processing)')
const pollProcessing = { status: 'IN_PROGRESS' }
const pollParsed2 = adapter.parsePollResponse(pollProcessing)
console.log('Parsed:', pollParsed2)
console.log()

console.log('✅ All tests completed!')
