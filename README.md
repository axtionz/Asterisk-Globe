# Asterisk Globe Testing V2

A React + Vite project featuring a 3D globe visualization using Deck.gl and GlobeView with dark theme and interactive camera controls.

## Features

- 🌍 3D Globe visualization using Deck.gl GlobeView
- 🎨 Dark theme with gradient background
- 🎮 Interactive camera controls (rotate, zoom, tilt)
- 📍 Sample data points (New York, Paris, Tokyo)
- ⚡ Fast development with Vite
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```bash
   # OpenAI API Configuration
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # OpenCage Geocoding API Configuration
   VITE_OPENCAGE_API_KEY=your_opencage_api_key_here
   ```
   
   **Note**: You'll need to obtain API keys from:
   - OpenAI: https://platform.openai.com/api-keys
   - OpenCage: https://opencagedata.com/users/sign_up

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Controls

- **Drag**: Rotate the globe
- **Scroll**: Zoom in/out
- **Right-click + drag**: Tilt the view
- **Click on points**: View point details in console

## Technologies Used

- React 18
- Vite
- Deck.gl
- React-Map-GL
- Mapbox GL

## Project Structure

```
src/
├── App.jsx          # Main application component
├── main.jsx         # Application entry point
└── index.css        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization

You can easily customize the globe by:

1. Modifying the `SAMPLE_DATA` in `App.jsx` to add more points
2. Changing the background gradient in the `style` prop of DeckGL
3. Adjusting camera controls in the `controller` prop
4. Adding new layers to the `layers` array 