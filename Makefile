.PHONY: help dev build start tunnel tunnel-setup clean install test docker-up docker-down

# Default target
help:
	@echo "Available commands:"
	@echo "  dev          - Start development server"
	@echo "  build        - Build the application"
	@echo "  start        - Start production server"
	@echo "  tunnel       - Start Cloudflare tunnel"
	@echo "  tunnel-setup - Set up Cloudflare tunnel (run once)"
	@echo "  install      - Install dependencies"
	@echo "  test         - Run tests"
	@echo "  docker-up    - Start Docker services"
	@echo "  docker-down  - Stop Docker services"
	@echo "  clean        - Clean build artifacts"

# Development
dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

install:
	pnpm install

# Testing
test:
	pnpm test

test-watch:
	pnpm test:watch

test-coverage:
	pnpm test:coverage

# Cloudflare Tunnel
tunnel:
	@echo "Starting Cloudflare tunnel..."
	@if [ ! -f cloudflare-tunnel.yml ]; then \
		echo "Error: cloudflare-tunnel.yml not found. Run 'make tunnel-setup' first."; \
		exit 1; \
	fi
	cloudflared tunnel --config cloudflare-tunnel.yml run

tunnel-setup:
	@echo "Setting up Cloudflare tunnel..."
	@echo "1. Install cloudflared if not already installed:"
	@echo "   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
	@echo "   sudo dpkg -i cloudflared.deb"
	@echo ""
	@echo "2. Login to Cloudflare:"
	@echo "   cloudflared tunnel login"
	@echo ""
	@echo "3. Create a tunnel:"
	@echo "   cloudflared tunnel create threads-scheduler"
	@echo ""
	@echo "4. Update cloudflare-tunnel.yml with your tunnel ID and domain"
	@echo "5. Create DNS record:"
	@echo "   cloudflared tunnel route dns threads-scheduler your-domain.com"
	@echo ""
	@echo "6. Run 'make tunnel' to start the tunnel"

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Cleanup
clean:
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf dist

# Database
db-generate:
	pnpm db:generate

db-push:
	pnpm db:push 