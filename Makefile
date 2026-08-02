# Huobao Drama - Makefile
# Tác giả: ThanhLD - macOS deploy
# Sử dụng: make <target>

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# ─── Variables ────────────────────────────────────────────────
PROJECT_NAME   := huobao-drama
BACKEND_DIR    := backend
FRONTEND_DIR   := frontend
CONFIGS_DIR    := configs
DATA_DIR       := data
SKILLS_DIR     := skills

BACKEND_PORT   := 5679
FRONTEND_PORT  := 3013
CONFIG_FILE    := $(CONFIGS_DIR)/config.yaml
EXAMPLE_CONFIG := $(CONFIGS_DIR)/config.example.yaml

DOCKER_IMAGE   := $(PROJECT_NAME):latest
DOCKER_CONTAINER := $(PROJECT_NAME)

# Màu sắc cho output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
RESET  := \033[0m

.DEFAULT_GOAL := help

# ─── Help ─────────────────────────────────────────────────────
.PHONY: help
help: ## Hiển thị danh sách lệnh
	@echo "$(GREEN)╔══════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║   Huobao Drama - Makefile Commands           ║$(RESET)"
	@echo "$(GREEN)╚══════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Environment ──────────────────────────────────────────────
.PHONY: check
check: ## Kiểm tra môi trường (Node, npm, FFmpeg, Docker)
	@echo "$(GREEN)→ Kiểm tra môi trường...$(RESET)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js chưa cài$(RESET)"; exit 1; }
	@echo "  ✓ Node: $$(node -v)"
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)✗ npm chưa cài$(RESET)"; exit 1; }
	@echo "  ✓ npm:  $$(npm -v)"
	@command -v ffmpeg >/dev/null 2>&1 || { echo "$(RED)✗ FFmpeg chưa cài - chạy: brew install ffmpeg$(RESET)"; exit 1; }
	@echo "  ✓ FFmpeg: $$(ffmpeg -version 2>&1 | head -1)"
	@command -v docker >/dev/null 2>&1 || echo "  $(YELLOW)⚠ Docker chưa cài (tùy chọn)$(RESET)"
	@command -v docker >/dev/null 2>&1 && echo "  ✓ Docker: $$(docker --version)"
	@echo "$(GREEN)✓ Môi trường sẵn sàng$(RESET)"

.PHONY: install-ffmpeg
install-ffmpeg: ## Cài FFmpeg qua Homebrew (macOS)
	@echo "$(GREEN)→ Cài FFmpeg...$(RESET)"
	@command -v ffmpeg >/dev/null 2>&1 && { echo "  ✓ FFmpeg đã có"; exit 0; }
	@command -v brew >/dev/null 2>&1 || { echo "$(RED)✗ Homebrew chưa cài$(RESET)"; exit 1; }
	brew install ffmpeg

# ─── Setup ────────────────────────────────────────────────────
.PHONY: setup
setup: check config install ## Setup toàn bộ: check môi trường + tạo config + cài deps
	@echo "$(GREEN)✓ Setup hoàn tất!$(RESET)"

.PHONY: config
config: ## Tạo config.yaml từ example
	@if [ ! -f "$(CONFIG_FILE)" ]; then \
		echo "$(GREEN)→ Tạo $(CONFIG_FILE) từ example...$(RESET)"; \
		cp "$(EXAMPLE_CONFIG)" "$(CONFIG_FILE)"; \
		echo "  ✓ Đã tạo config"; \
	else \
		echo "  $(YELLOW)⚠ $(CONFIG_FILE) đã tồn tại$(RESET)"; \
	fi

.PHONY: data-dir
data-dir: ## Tạo thư mục data nếu chưa có
	@mkdir -p $(DATA_DIR)/static $(DATA_DIR)/storage
	@echo "$(GREEN)✓ Đã chuẩn bị thư mục data$(RESET)"

.PHONY: dist-symlink
dist-symlink: ## Tạo symlink frontend/dist -> .output/public (backend serve từ dist/)
	@cd $(FRONTEND_DIR) && [ -L dist ] || ln -s .output/public dist
	@echo "$(GREEN)✓ frontend/dist -> .output/public$(RESET)"

# ─── Install ──────────────────────────────────────────────────
.PHONY: install
install: install-backend install-frontend ## Cài đặt dependencies cho backend và frontend
	@echo "$(GREEN)✓ Tất cả dependencies đã cài$(RESET)"

.PHONY: install-backend
install-backend: ## Cài dependencies cho backend
	@echo "$(GREEN)→ Cài backend dependencies...$(RESET)"
	@cd $(BACKEND_DIR) && npm install
	@echo "  ✓ Backend done"

.PHONY: install-frontend
install-frontend: ## Cài dependencies cho frontend
	@echo "$(GREEN)→ Cài frontend dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "  ✓ Frontend done"

# ─── Dev mode ─────────────────────────────────────────────────
.PHONY: dev
dev: dev-backend ## Chạy dev mode (backend + frontend)
	@echo "$(GREEN)→ Frontend: http://localhost:$(FRONTEND_PORT)$(RESET)"
	@echo "$(GREEN)→ Backend:  http://localhost:$(BACKEND_PORT)$(RESET)"

.PHONY: dev-backend
dev-backend: ## Chạy backend dev (port 5679)
	@echo "$(GREEN)→ Khởi động backend dev...$(RESET)"
	@cd $(BACKEND_DIR) && npm run dev

.PHONY: dev-frontend
dev-frontend: ## Chạy frontend dev (port 3013)
	@echo "$(GREEN)→ Khởi động frontend dev...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run dev

.PHONY: dev-all
dev-all: ## Chạy backend + frontend song song (cần GNU parallel hoặc mở 2 terminal)
	@echo "$(GREEN)→ Mở 2 terminal:$(RESET)"
	@echo "  Terminal 1: $(YELLOW)make dev-backend$(RESET)"
	@echo "  Terminal 2: $(YELLOW)make dev-frontend$(RESET)"

# ─── Production build ─────────────────────────────────────────
.PHONY: build
build: build-frontend dist-symlink ## Build production (frontend + symlink dist)
	@echo "$(GREEN)✓ Build hoàn tất$(RESET)"

.PHONY: build-frontend
build-frontend: ## Build frontend (SPA tĩnh)
	@echo "$(GREEN)→ Build frontend...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run generate
	@echo "  ✓ Frontend build xong → $(FRONTEND_DIR)/.output/public"

.PHONY: typecheck
typecheck: ## TypeScript type check cho backend
	@echo "$(GREEN)→ Type check backend...$(RESET)"
	@cd $(BACKEND_DIR) && npm run typecheck

# ─── Deploy / Start ───────────────────────────────────────────
.PHONY: start
start: build data-dir ## Deploy local: build frontend + start backend (single service)
	@echo "$(GREEN)→ Khởi động backend (serve cả frontend tĩnh)...$(RESET)"
	@echo "$(GREEN)→ Truy cập: http://localhost:$(BACKEND_PORT)$(RESET)"
	@cd $(BACKEND_DIR) && npm start

.PHONY: deploy
deploy: setup build start ## Deploy hoàn chỉnh: setup + build + start

# ─── Docker ───────────────────────────────────────────────────
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(GREEN)→ Build Docker image...$(RESET)"
	docker build -t $(DOCKER_IMAGE) .

.PHONY: docker-run
docker-run: ## Chạy Docker container
	@echo "$(GREEN)→ Khởi động Docker container...$(RESET)"
	docker run -d \
		--name $(DOCKER_CONTAINER) \
		-p $(BACKEND_PORT):$(BACKEND_PORT) \
		-v $$(pwd)/$(DATA_DIR):/app/$(DATA_DIR) \
		-v $$(pwd)/$(CONFIG_FILE):/app/$(CONFIG_FILE) \
		--restart unless-stopped \
		$(DOCKER_IMAGE)
	@echo "$(GREEN)✓ Container đang chạy: http://localhost:$(BACKEND_PORT)$(RESET)"

.PHONY: docker-compose-up
docker-compose-up: data-dir ## Chạy bằng docker compose
	@echo "$(GREEN)→ Khởi động với docker compose...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)✓ Truy cập: http://localhost:$(BACKEND_PORT)$(RESET)"

.PHONY: docker-compose-down
docker-compose-down: ## Dừng docker compose
	docker compose down

.PHONY: docker-logs
docker-logs: ## Xem logs Docker container
	docker logs -f $(DOCKER_CONTAINER)

.PHONY: docker-stop
docker-stop: ## Dừng và xóa Docker container
	docker stop $(DOCKER_CONTAINER) 2>/dev/null || true
	docker rm $(DOCKER_CONTAINER) 2>/dev/null || true

.PHONY: docker-deploy
docker-deploy: docker-build docker-run ## Build + chạy Docker container

# ─── Utility ──────────────────────────────────────────────────
.PHONY: logs
logs: ## Xem logs backend (foreground)
	@echo "$(GREEN)→ Đợi 3 giây để xem logs...$(RESET)"
	@sleep 3 && tail -f $(BACKEND_DIR)/logs/*.log 2>/dev/null || echo "Không tìm thấy log file"

.PHONY: status
status: ## Kiểm tra trạng thái services
	@echo "$(GREEN)→ Trạng thái services:$(RESET)"
	@lsof -i :$(BACKEND_PORT) 2>/dev/null | head -3 || echo "  Backend port $(BACKEND_PORT): free"
	@lsof -i :$(FRONTEND_PORT) 2>/dev/null | head -3 || echo "  Frontend port $(FRONTEND_PORT): free"

.PHONY: health
health: ## Health check API
	@curl -s http://localhost:$(BACKEND_PORT)/health || echo "$(RED)✗ Backend không phản hồi$(RESET)"

.PHONY: clean
clean: ## Dọn node_modules và build artifacts
	@echo "$(YELLOW)→ Dọn dẹp...$(RESET)"
	@rm -rf $(BACKEND_DIR)/node_modules $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/.output $(FRONTEND_DIR)/.nuxt
	@rm -rf $(DATA_DIR)/huobao_drama.db $(DATA_DIR)/huobao_drama.db-*
	@echo "$(GREEN)✓ Đã dọn xong$(RESET)"

.PHONY: clean-all
clean-all: clean docker-stop ## Dọn tất cả (deps + docker)
	@echo "$(GREEN)✓ Clean toàn bộ hoàn tất$(RESET)"

# ─── DB ───────────────────────────────────────────────────────
.PHONY: db-reset
db-reset: ## Reset database (xóa file .db, tự tạo lại khi start)
	@echo "$(YELLOW)⚠ Xóa database...$(RESET)"
	@rm -f $(DATA_DIR)/huobao_drama.db $(DATA_DIR)/huobao_drama.db-*
	@echo "$(GREEN)✓ Database đã reset (sẽ tự tạo khi start)$(RESET)"

# ─── Quick test ───────────────────────────────────────────────
.PHONY: verify
verify: ## Verify deploy (check config, deps, ports)
	@echo "$(GREEN)→ Verifying deploy...$(RESET)"
	@echo "  - Config file: $$(ls -la $(CONFIG_FILE) 2>&1 | awk '{print $$NF}')"
	@echo "  - Backend node_modules: $$(ls $(BACKEND_DIR)/node_modules 2>/dev/null | wc -l | tr -d ' ') packages"
	@echo "  - Frontend node_modules: $$(ls $(FRONTEND_DIR)/node_modules 2>/dev/null | wc -l | tr -d ' ') packages"
	@echo "  - Frontend build: $$(ls $(FRONTEND_DIR)/.output/public 2>/dev/null | wc -l | tr -d ' ') files"
	@echo "$(GREEN)✓ Verify done$(RESET)"
