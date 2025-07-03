# Cloudflare Tunnel Setup

This guide helps you set up a Cloudflare tunnel for your threads-scheduler project.

## Quick Start

1. **Run the setup helper:**
   ```bash
   make tunnel-setup
   ```

2. **Follow the instructions to configure your tunnel**

3. **Start the tunnel:**
   ```bash
   make tunnel
   ```

## Manual Setup Steps

### 1. Install cloudflared

```bash
# Download and install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open a browser window for you to log in to your Cloudflare account.

### 3. Create a tunnel

```bash
cloudflared tunnel create threads-scheduler
```

This creates a tunnel and saves the credentials to `~/.cloudflared/`.

### 4. Configure your tunnel

Update `cloudflare-tunnel.yml` with:
- Your tunnel ID (from step 3)
- Your domain name
- The credentials file path

Example:
```yaml
tunnel: abc123def456-your-tunnel-id
credentials-file: ~/.cloudflared/abc123def456-your-tunnel-id.json

ingress:
  - hostname: threads-scheduler.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 5. Create DNS record

```bash
cloudflared tunnel route dns threads-scheduler threads-scheduler.yourdomain.com
```

### 6. Start your app and tunnel

```bash
# Terminal 1: Start your Next.js app
make dev

# Terminal 2: Start the tunnel
make tunnel
```

## Troubleshooting

- **Permission denied**: Make sure cloudflared is executable: `chmod +x /usr/local/bin/cloudflared`
- **Tunnel not found**: Verify your tunnel ID in `cloudflare-tunnel.yml` matches the one created
- **DNS issues**: Wait a few minutes for DNS propagation after creating the route

## Security Notes

- Keep your tunnel credentials file (`~/.cloudflared/*.json`) secure
- Only expose the specific services you need
- Consider using Cloudflare Access for additional security 