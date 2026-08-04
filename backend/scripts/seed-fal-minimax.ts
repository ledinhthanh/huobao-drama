/**
 * Seed fal.ai MiniMax H3 provider và config vào database
 */
import { db, schema } from '../src/db/index.js'
import { eq } from 'drizzle-orm'

async function seedFalMinimax() {
  const now = new Date().toISOString()

  // 1. Thêm provider vào ai_service_providers
  const existingProvider = db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'fal-minimax'))
    .all()

  if (existingProvider.length === 0) {
    db.insert(schema.aiServiceProviders).values({
      name: 'fal-minimax',
      displayName: 'fal.ai MiniMax H3',
      serviceType: 'video',
      provider: 'fal-minimax',
      defaultUrl: 'https://fal.ai',
      presetModels: JSON.stringify([
        'minimax/h3/text-to-video',
        'minimax/h3/image-to-video',
        'minimax/h3/reference-to-video'
      ]),
      description: 'MiniMax H3 video generation via fal.ai - supports text-to-video, image-to-video, and reference-to-video',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run()
    console.log('✅ Added fal-minimax provider')
  } else {
    console.log('ℹ️  fal-minimax provider already exists')
  }

  // 2. Thêm config mặc định
  const existingConfig = db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.provider, 'fal-minimax'))
    .all()

  if (existingConfig.length === 0) {
    db.insert(schema.aiServiceConfigs).values({
      serviceType: 'video',
      provider: 'fal-minimax',
      name: 'fal-minimax Default',
      baseUrl: 'https://fal.ai',
      apiKey: process.env.FAL_API_KEY || 'YOUR_FAL_API_KEY',
      model: JSON.stringify(['minimax/h3/text-to-video']),
      endpoint: 'minimax/h3/text-to-video',
      queryEndpoint: 'requests/{task_id}/status',
      priority: 10,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run()
    console.log('✅ Added fal-minimax config (set FAL_API_KEY env var to your key)')
  } else {
    console.log('ℹ️  fal-minimax config already exists')
  }

  // 3. Hiển thị configs
  console.log('\n📋 Current AI Configs:')
  const configs = db.select().from(schema.aiServiceConfigs).all()
  configs.forEach(c => {
    console.log(`  - ${c.name} (${c.provider}) - ${c.serviceType} - isDefault: ${c.isDefault} - isActive: ${c.isActive}`)
  })

  console.log('\n✅ Seed complete!')
}

seedFalMinimax().catch(console.error)
