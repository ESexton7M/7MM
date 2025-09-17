# Asana Analytics Dashboard

A comprehensive React TypeScript application for visualizing and analyzing Asana project data, providing insights into task completion times, project durations, and workflow metrics.

<img width="1920" height="3577" alt="image" src="https://github.com/user-attachments/assets/6d9e72f2-bc78-49a2-a8f4-19b40f40f5f0" />


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
   ```

3. Create a `.env` file in the root directory with your Asana token:
   ```
   VITE_ASANA_TOKEN=your_personal_access_token
   ```
   
   > **Note**: You can generate an Asana Personal Access Token in your [Asana Developer Console](https://app.asana.com/0/developer-console).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

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
