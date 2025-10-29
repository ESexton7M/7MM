# Deployment Guide for Plesk

## Quick Start (Single Command)

The easiest way to run both frontend and backend servers simultaneously is to use:

```bash
npm start
```

This single command will:
- Start the backend cache server on port 8080
- Start the Vite frontend dev server on port 3000

Both servers will run concurrently in the same process.

## Available Commands

### Development
- **`npm start`** - Run both frontend and backend together (recommended)
- **`npm run dev`** - Run only the frontend (Vite dev server)
- **`npm run server`** - Run only the backend (cache server)

### Production
- **`npm run build`** - Build the frontend for production
- **`npm run start:prod`** - Run backend + production preview server

### Setup
- **`npm run install:server`** - Install backend dependencies

## Plesk Configuration

### Option 1: Using npm start (Recommended)

In your Plesk Node.js settings:

1. **Application Mode**: Production or Development
2. **Application Root**: `/analyzer`
3. **Application Startup File**: Leave blank or use default
4. **Custom Startup Command**: `npm start`
5. **Environment Variables**: 
   - Add your `ASANA_ACCESS_TOKEN` and other required variables

### Option 2: Using PM2 (Advanced)

If Plesk has PM2 available, create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'asana-backend',
      cwd: './server',
      script: 'server.js',
      env: {
        PORT: 8080
      }
    },
    {
      name: 'asana-frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        PORT: 3000
      }
    }
  ]
};
```

Then run: `pm2 start ecosystem.config.cjs`

## Port Configuration

- **Frontend**: Port 3000 (Vite dev server)
- **Backend**: Port 8080 (Express cache server)

Make sure both ports are open in your Plesk firewall settings.

## Environment Variables Required

Create a `.env` file in the `/analyzer` directory:

```env
VITE_ASANA_ACCESS_TOKEN=your_token_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Production Build

For production deployment:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. The built files will be in `/analyzer/dist`

3. You can serve the built files with a static server or use:
   ```bash
   npm run start:prod
   ```

## Troubleshooting

### "Only one command runs at a time"
- Use `npm start` which runs both servers concurrently
- Or use PM2 process manager if available in Plesk

### "Port already in use"
- Check if another service is using port 3000 or 8080
- Modify port in `vite.config.ts` or `server/server.js`

### "Module not found"
- Run `npm install` in the main directory
- Run `npm run install:server` for backend dependencies

## Monitoring

When using `npm start`, you'll see output from both servers:

```
[server] Cache server running on port 8080
[dev] VITE v5.1.6 ready in 423 ms
[dev] ➜ Local: http://localhost:3000/
```

Press `Ctrl+C` to stop both servers.
