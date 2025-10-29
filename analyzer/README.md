# Asana Analytics Dashboard

A comprehensive React TypeScript application for visualizing and analyzing Asana project data, providing insights into task completion times, project durations, and workflow metrics.

![Asana Dashboard Screenshot](https://via.placeholder.com/1200x600?text=Asana+Analytics+Dashboard)

## Features

- **Project Data Visualization**: View task completion metrics and analyze project efficiency
- **Cross-Project Analysis**: Compare durations across multiple projects with filtering and sorting options
- **Section Completion Analytics**: Break down project stages to identify bottlenecks and optimize workflows
- **Interactive Charts**: Visualize data through responsive, interactive charts powered by Recharts
- **Smooth Animations**: Enhanced user experience with GSAP animations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **TypeScript Integration**: Full type safety throughout the application

## Getting Started

### Prerequisites

- Node.js (v16+)
- Asana Personal Access Token

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/asana-analytics-dashboard.git
   cd asana-analytics-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   npm run install:server
   ```

3. Create a `.env` file in the root directory with your Asana token:
   ```
   VITE_ASANA_ACCESS_TOKEN=your_personal_access_token
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```
   
   > **Note**: You can generate an Asana Personal Access Token in your [Asana Developer Console](https://app.asana.com/0/developer-console).

4. Start both frontend and backend servers:
   ```bash
   npm start
   ```
   
   This will start:
   - Backend cache server on port 8080
   - Frontend dev server on port 3000

5. Build for production:
   ```bash
   npm run build
   ```

## Deployment

For Plesk or other hosting platforms, see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on running both servers simultaneously.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run both frontend and backend servers together (recommended) |
| `npm run dev` | Run only the frontend Vite dev server |
| `npm run server` | Run only the backend cache server |
| `npm run build` | Build the frontend for production |
| `npm run start:prod` | Run backend + production preview server |
| `npm run install:server` | Install backend server dependencies |
| `npm run lint` | Run ESLint code linting |

## Project Structure

```
src/
├── components/         # UI components
│   ├── DashboardView.tsx
│   ├── ErrorDisplay.tsx
│   ├── LoadingSpinner.tsx
│   ├── ProjectDurationChart.tsx
│   └── TaskTable.tsx
├── types/              # TypeScript interfaces
│   └── index.ts
├── utils/              # Utility functions
│   └── env.ts
├── App.tsx             # Main application component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## Technology Stack

- **React**: UI library
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and development server
- **Recharts**: Chart visualization
- **GSAP**: Animation library
- **TailwindCSS**: Utility-first CSS framework

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_ASANA_TOKEN` | Asana Personal Access Token for API authentication |

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Asana API](https://developers.asana.com/docs) for providing the data endpoints
- [Recharts](https://recharts.org) for the charting library
- [GSAP](https://greensock.com/gsap/) for animations
```
