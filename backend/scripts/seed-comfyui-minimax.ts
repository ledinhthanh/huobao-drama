/**
 * Seed ComfyUI MiniMax H3 provider và config vào database
 * Server: 10.0.0.124:8188
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/index.js";

async function seedComfyUIMinimax() {
  const now = new Date().toISOString();

  // 1. Thêm provider vào ai_service_providers
  const existingProvider = db
    .select()
    .from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, "comfyui-minimax"))
    .all();

  if (existingProvider.length === 0) {
    db.insert(schema.aiServiceProviders)
      .values({
        name: "comfyui-minimax",
        displayName: "ComfyUI MiniMax H3 (Local)",
        serviceType: "video",
        provider: "comfyui-minimax",
        defaultUrl: "http://10.0.0.124:8188",
        presetModels: JSON.stringify([
          "minimax-h3-text-to-video",
          "minimax-h3-image-to-video",
        ]),
        description:
          "MiniMax H3 video generation via local ComfyUI server at 10.0.0.124. Uses native ComfyUI 0.30+ MiniMaxH3 nodes.",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    console.log("✅ Added comfyui-minimax provider");
  } else {
    console.log("ℹ️  comfyui-minimax provider already exists");
  }

  // 2. Thêm config mặc định
  const existingConfig = db
    .select()
    .from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.provider, "comfyui-minimax"))
    .all();

  if (existingConfig.length === 0) {
    db.insert(schema.aiServiceConfigs)
      .values({
        serviceType: "video",
        provider: "comfyui-minimax",
        name: "ComfyUI MiniMax H3 Local",
        baseUrl: "http://10.0.0.124:8188",
        apiKey: "",
        model: JSON.stringify(["minimax-h3-text-to-video"]),
        endpoint: "/prompt",
        queryEndpoint: "/history",
        priority: 20,
        isDefault: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    console.log("✅ Added comfyui-minimax config");
  } else {
    console.log("ℹ️  comfyui-minimax config already exists");
  }

  console.log("\n📋 Current Video AI Configs:");
  const configs = db
    .select()
    .from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.serviceType, "video"))
    .all();
  configs.forEach((c) => {
    console.log(
      `  - ${c.name} (${c.provider}) - baseUrl: ${c.baseUrl} - isDefault: ${c.isDefault}`,
    );
  });

  console.log("\n✅ Seed complete!");
}

seedComfyUIMinimax().catch(console.error);
