# Asana Analytics Dashboard

A comprehensive React TypeScript application for visualizing and analyzing Asana project data, providing insights into task completion times, project durations, and workflow metrics.

<img width="1920" height="3677" alt="screencapture-analytics-7mountainscreative-2025-09-18-14_05_13" src="https://github.com/user-attachments/assets/dbf56cc4-5d6b-4e3c-9c81-e1b6c13cb0be" />

## Features

- **Project Data Visualization**: View task completion metrics and analyze project efficiency
- **Cross-Project Analysis**: Compare durations across multiple projects with filtering and sorting options
- **Section Completion Analytics**: Break down project stages to identify bottlenecks and optimize workflows
- **Server-Side Caching**: Persistent cache with automatic 2-day refresh cycle
- **Interactive Charts**: Visualize data through responsive, interactive charts powered by Recharts
- **Smooth Animations**: Enhanced user experience with GSAP animations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **TypeScript Integration**: Full type safety throughout the application

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm
- Asana Personal Access Token
- Google OAuth Client ID (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/asana-analytics-dashboard.git
   cd asana-analytics-dashboard
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

3. Configure environment variables in `analyzer/.env`:
   ```
   VITE_ASANA_TOKEN=your_personal_access_token
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_ASANA_API_BASE=https://app.asana.com/api/1.0
   ```
   
   > **Note**: Generate an Asana Personal Access Token in your [Asana Developer Console](https://app.asana.com/0/developer-console).

### Running the Application

#### Development Mode

Start both the backend server and frontend development server:
```bash
npm run dev
```

This will:
- Start the API server on http://localhost:8080
- Start the Vite dev server on http://localhost:3000
- Open the application in your browser automatically

#### Production Mode

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Project Structure

```
7MM/
├── analyzer/                 # Main application
│   ├── src/                  # React TypeScript source
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Utility functions
│   │   └── config/           # Configuration files
│   ├── server/               # Backend API server
│   │   ├── server.js         # Express server with caching
│   │   └── cache/            # Server-side cache storage
│   ├── public/               # Static assets
│   └── dist/                 # Built application (generated)
├── package.json              # Root package configuration
└── README.md                 # This file
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Recharts, GSAP
- **Backend**: Node.js, Express, Node-cron, Axios

## API Endpoints

- `GET /api/health` - Health check and server status
- `GET /api/cache/status` - Get cache status and expiration info
- `GET /api/cache/projects` - Retrieve cached projects
- `POST /api/cache/projects` - Update projects cache
- `DELETE /api/cache/clear` - Clear all cached data

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_ASANA_TOKEN` | Asana Personal Access Token | Yes |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | No |
| `PORT` | Server port (default: 8080) | No |

## Troubleshooting

### Port Already in Use

The server automatically tries ports 8080-8090. Set a custom port:
```bash
PORT=9000 npm start
```

### Cache Issues

Clear the cache:
```bash
curl -X DELETE http://localhost:8080/api/cache/clear
```

## License

MIT License

## Acknowledgments

- [Asana API](https://developers.asana.com/docs)
- [Recharts](https://recharts.org)
- [GSAP](https://greensock.com/gsap/)
