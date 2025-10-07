# Asana Analytics Server

This server provides centralized caching for the Asana Analytics Dashboard, replacing browser localStorage with server-side storage.

## Features

- **Centralized Cache**: All users share the same cached data
- **Automatic Refresh**: Cache automatically refreshes every 2 days at midnight
- **API Endpoints**: RESTful API for cache management
- **Persistent Storage**: File-based cache storage on the server

## Setup

### Local Development

1. Install dependencies:
```bash
npm run install:server
```

2. Start the server:
```bash
npm run server:dev
```

3. In another terminal, start the client:
```bash
npm run dev
```

### Production Deployment

1. Build the client application:
```bash
npm run build
```

2. Install server dependencies:
```bash
cd server && npm install
```

3. Start the server:
```bash
cd server && npm start
```

The server will:
- Serve the built client application from `/dist`
- Provide API endpoints at `/api/*`
- Store cache files in `./cache/` directory
- Run automatic cleanup every 2 days at midnight

## API Endpoints

- `GET /api/cache/status` - Get cache status and metadata
- `GET /api/cache/projects` - Get cached projects (if valid)
- `GET /api/cache/analyzed` - Get cached analyzed data (if valid)
- `POST /api/cache/projects` - Store projects in cache
- `POST /api/cache/analyzed` - Store analyzed data in cache
- `DELETE /api/cache/clear` - Clear all cache
- `POST /api/cache/refresh` - Manual cache refresh (requires Asana token)

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3001)
- `VITE_API_BASE` - API base URL for client (default: empty for same origin)

### Cache Settings

- **Expiration**: 2 days (48 hours)
- **Cleanup Schedule**: Every 2 days at midnight (cron: `0 0 */2 * *`)
- **Storage**: JSON files in `./cache/` directory

## File Structure

```
server/
├── package.json        # Server dependencies
├── server.js          # Main server application
└── cache/             # Cache storage directory
    ├── projects.json  # Cached projects data
    ├── analyzed.json  # Cached analyzed data
    └── metadata.json  # Cache metadata and timestamps
```

## Troubleshooting

### Permission Issues on Plesk

If you get permission denied errors for node_modules/.bin/vite:

```bash
chmod +x node_modules/.bin/*
```

### Cache Issues

To clear all cache:
```bash
curl -X DELETE http://your-domain.com/api/cache/clear
```

To check cache status:
```bash
curl http://your-domain.com/api/cache/status
```