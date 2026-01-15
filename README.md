<p align="center">
  <img src="logo.png" alt="LazyKitty Logo" width="200" />
  <br />
  <strong>LazyKitty</strong>
</p>

<p align="center">
  Self-hosted build infrastructure for Expo apps.<br />
  A free, open-source alternative to <a href="https://expo.dev/eas">EAS (Expo Application Services)</a>.
</p>

---

Deploy your Expo updates to your own infrastructure and serve them directly to Expo Go or your production app.

## Features

- **Self-hosted** - Run on your own servers, no vendor lock-in
- **Expo Go compatible** - Test updates instantly on your phone
- **CLI tool** - Simple `lazykitty deploy` from your project
- **Full Updates Protocol v1** - Compatible with `expo-updates`
- **Multi-platform** - Supports iOS and Android

## Quick Start

### 1. Deploy the Server

#### Docker Compose (Recommended for VPS)

```bash
git clone https://github.com/Kacppian/lazykitty.git
cd lazykitty
docker-compose up -d
```

#### Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
cd packages/api
fly launch
fly deploy
```

#### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/lazykitty)

Or manually:
1. Fork this repo
2. Connect to Railway
3. Deploy the `packages/api` directory

#### Render

1. Fork this repo
2. Create a new Web Service on Render
3. Connect your repo and set root directory to `packages/api`
4. Set build command: `cd ../.. && pnpm install && pnpm build`
5. Set start command: `node dist/index.js`

### 2. Install the CLI

```bash
npm install -g lazykitty
# or
pnpm add -g lazykitty
```

### 3. Initialize Your Project

```bash
cd your-expo-app
lazykitty init
```

This creates a `lazykitty.json` config file in your project.

### 4. Configure the API URL

```bash
lazykitty login
# Enter your server URL (e.g., https://lazykitty.your-domain.com)
# Enter API key (default: lazykitty-dev-key for development)
```

### 5. Deploy!

```bash
lazykitty deploy
```

You'll get a QR code and URL to open in Expo Go:

```
exp://your-server.com/v1/manifest/bld_xxxxx
```

## Architecture

```
lazykitty/
├── packages/
│   ├── cli/          # Command-line interface
│   ├── api/          # HTTP server (Hono)
│   ├── builder/      # Build service
│   └── shared/       # Shared types
└── apps/
    └── test-expo-app # Example Expo app
```

### How It Works

1. **Deploy**: CLI creates a tarball of your Expo project and uploads it
2. **Build**: Server runs `npx expo export` to generate JS bundles
3. **Serve**: Manifests are served via Expo Updates Protocol v1
4. **Load**: Expo Go or your app fetches and runs the update

## CLI Commands

| Command | Description |
|---------|-------------|
| `lazykitty init` | Initialize project config |
| `lazykitty login` | Configure API credentials |
| `lazykitty deploy` | Deploy current project |
| `lazykitty status <buildId>` | Check build status |
| `lazykitty list` | List recent builds |

## Environment Variables

### API Server

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `API_KEY` | Authentication key | `lazykitty-dev-key` |
| `BASE_URL` | Public URL for assets | `http://localhost:3000` |
| `STORAGE_PATH` | Path for build storage | `./storage` |

### Example `.env`

```env
PORT=3000
API_KEY=your-secure-api-key
BASE_URL=https://lazykitty.your-domain.com
STORAGE_PATH=/data/storage
```

## Configuration

### Project Config (`lazykitty.json`)

```json
{
  "projectSlug": "my-app",
  "runtimeVersion": "1.0.0"
}
```

### Expo App Config (`app.json`)

Make sure your Expo app has:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "sdkVersion": "54.0.0",
    "runtimeVersion": "1.0.0"
  }
}
```

## Production Deployment

### With Docker

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  lazykitty:
    build: .
    ports:
      - "3000:3000"
    environment:
      - API_KEY=${API_KEY}
      - BASE_URL=${BASE_URL}
    volumes:
      - lazykitty-storage:/app/storage

volumes:
  lazykitty-storage:
```

### With nginx (SSL termination)

```nginx
server {
    listen 443 ssl;
    server_name lazykitty.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/lazykitty.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lazykitty.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start API server (with hot reload)
pnpm --filter @lazykitty/api dev

# Run CLI commands
cd apps/test-expo-app
node ../../packages/cli/dist/index.js deploy
```

## Troubleshooting

### "Failed to parse manifest JSON"

Make sure your `app.json` includes `sdkVersion`:

```json
{
  "expo": {
    "sdkVersion": "54.0.0"
  }
}
```

### Expo Go crashes on load

This usually means the bundle format is incompatible. LazyKitty uses `--no-bytecode` to generate plain JavaScript bundles for maximum compatibility.

### "scopeKey is null" error

This was fixed - ensure you're using the latest version. The `scopeKey` must be inside the `extra` object in the manifest.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE) - feel free to use this in your own projects!

## Acknowledgments

- [Expo](https://expo.dev) for the amazing React Native tooling
- [Hono](https://hono.dev) for the lightweight web framework
- The open-source community

---

Made with laziness by the LazyKitty contributors
