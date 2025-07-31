# PlotManager System Documentation

## Overview

The PlotManager system is a modular, dynamic layer management system for Deck.gl that receives structured JSON event instructions and generates appropriate visual effects. It supports various visual effects including pulsing dots, animated arcs, explosion effects, glowing borders, and directional arrows.

## Features

### Visual Effects Supported

1. **Pulsing Dots** (`pulsing_dot`)
   - Animated circular markers that pulse with configurable intensity and speed
   - Perfect for earthquakes, storms, and other point-based events

2. **Animated Arcs** (`animated_arc`)
   - Dynamic curved lines between two points
   - Supports color gradients and animation effects
   - Ideal for showing connections, paths, or data flow

3. **Explosion Effects** (`explosion`)
   - Expanding circular effects with configurable duration
   - Great for volcanic eruptions, nuclear events, or meteor impacts

4. **Glowing Borders** (`glowing_border`)
   - Animated border effects with pulsing opacity
   - Useful for highlighting regions or areas of interest

5. **Directional Arrows** (`directional_arrow`)
   - Arrow-shaped markers indicating direction
   - Configurable length, width, and orientation
   - Perfect for showing movement or flow direction

6. **Event Markers** (`event_marker`)
   - Static circular markers for simple event visualization
   - Configurable size, color, and stroke

7. **Area Highlights** (`area_highlight`)
   - Polygon-based area highlighting
   - Supports fill and stroke colors
   - Ideal for regional events or coverage areas

### Core Capabilities

- **Dynamic Layer Management**: Add/remove layers at runtime
- **Batch Processing**: Process multiple event instructions simultaneously
- **Animation Support**: Built-in animation loops for dynamic effects
- **Styling Parameters**: Comprehensive styling options for each effect type
- **Layer Statistics**: Track and monitor active layers
- **Type-based Operations**: Remove or manage layers by type

## Architecture

### Core Components

1. **PlotManager Class**
   - Main orchestrator for layer management
   - Handles layer lifecycle and animation
   - Provides batch processing capabilities

2. **LayerGenerators Class**
   - Static methods for creating different layer types
   - Handles animation functions and styling
   - Modular design for easy extension

3. **EventProcessor Class**
   - Converts natural language to structured instructions
   - Supports keyword-based event detection
   - Integrates with geocoding services

4. **React Hooks**
   - `usePlotManager()`: Provides PlotManager functionality
   - `useEventProcessor()`: Provides EventProcessor functionality

## Usage Examples

### Basic Usage

```javascript
import { usePlotManager } from './PlotManager';

function MyComponent() {
  const { addLayer, getAllLayers, clearAllLayers } = usePlotManager();

  // Add a pulsing dot
  const addPulsingDot = () => {
    addLayer({
      type: 'pulsing_dot',
      data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo' }],
      options: {
        baseRadius: 8000,
        pulseIntensity: 0.4,
        pulseSpeed: 1.5,
        color: [255, 0, 0, 180]
      }
    });
  };

  // Get all layers for DeckGL
  const layers = getAllLayers();

  return (
    <DeckGL layers={layers} />
  );
}
```

### Event Processing

```javascript
import { useEventProcessor } from './EventProcessor';

function MyComponent() {
  const { processEvent } = useEventProcessor();

  const handleNaturalLanguage = async (description) => {
    try {
      const results = await processEvent("Earthquake in Tokyo, magnitude 6.1");
      console.log('Processed events:', results);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };
}
```

### Batch Processing

```javascript
const batchInstructions = [
  {
    type: 'pulsing_dot',
    data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo' }],
    options: { color: [255, 0, 0, 180] }
  },
  {
    type: 'explosion',
    data: [{ longitude: -74.006, latitude: 40.7128, location: 'New York' }],
    options: { color: [255, 165, 0, 180] }
  }
];

const results = processEventBatch(batchInstructions);
```

## Configuration Options

### Pulsing Dot Options

```javascript
{
  baseRadius: 5000,        // Base radius in meters
  pulseIntensity: 0.3,     // Pulse intensity (0-1)
  pulseSpeed: 2,           // Pulse speed multiplier
  color: [255, 0, 0, 180], // RGBA color array
  strokeColor: [255, 255, 255, 255],
  strokeWidth: 1,
  height: 50000,           // Height above surface
  pickable: true
}
```

### Animated Arc Options

```javascript
{
  strokeWidth: 4,
  sourceColor: [255, 0, 0, 120],
  targetColor: [255, 140, 0, 120],
  opacity: 0.7,
  pickable: true,
  animationSpeed: 1,
  dashArray: [0, 0]        // [dash, gap] for dashed lines
}
```

### Explosion Options

```javascript
{
  baseRadius: 10000,       // Starting radius
  maxRadius: 50000,        // Maximum expansion radius
  duration: 2000,          // Animation duration in ms
  color: [255, 165, 0, 150],
  strokeColor: [255, 255, 255, 200],
  strokeWidth: 2,
  height: 100000,
  pickable: true
}
```

### Directional Arrow Options

```javascript
{
  arrowLength: 0.5,        // Length in degrees
  arrowWidth: 0.1,         // Width in degrees
  color: [255, 255, 0, 200],
  strokeWidth: 2,
  height: 75000,
  pickable: true
}
```

## Natural Language Processing

The EventProcessor supports various natural language patterns:

### Event Types
- **Earthquakes**: "earthquake", "quake", "seismic"
- **Volcanoes**: "volcano", "eruption", "volcanic"
- **Storms**: "storm", "hurricane", "typhoon", "cyclone"
- **Tsunamis**: "tsunami", "tidal wave"
- **Fires**: "fire", "wildfire", "blaze"
- **Floods**: "flood", "flooding"
- **Nuclear**: "nuclear", "atomic", "radiation"
- **Meteors**: "meteor", "asteroid", "impact"

### Location Extraction
- Pattern matching: "in Tokyo", "at New York", "near Paris"
- City name recognition for major cities
- Fallback geocoding support

### Magnitude Extraction
- Pattern: "magnitude 6.1"
- Automatic intensity scaling for visual effects

### Direction Detection
- Cardinal directions: "north", "south", "east", "west"
- Intercardinal: "northeast", "southwest", etc.
- Abbreviations: "n", "s", "e", "w", "ne", "sw", etc.

## Integration with Existing Systems

### DeckGL Integration

```javascript
// In your main App component
const plotManagerLayers = plotManager.getAllLayers();

const layers = [
  // Your existing layers
  oceanLayer,
  landLayer,
  // PlotManager layers
  ...plotManagerLayers
].filter(Boolean);

<DeckGL layers={layers} />
```

### Chat System Integration

```javascript
const handleChatInput = async (input) => {
  try {
    // Try PlotManager first
    const results = await eventProcessor.processEvent(input);
    if (results.length > 0) {
      // PlotManager handled it
      return;
    }
    
    // Fallback to existing system
    const parsedEvents = await extractEventDataWithLLM(input);
    // ... existing processing
  } catch (error) {
    console.error('Processing failed:', error);
  }
};
```

## Performance Considerations

### Layer Management
- Layers are automatically cleaned up when removed
- Animation loops are optimized for performance
- Batch processing reduces render cycles

### Memory Management
- Layer data is stored efficiently
- Automatic cleanup on component unmount
- Configurable layer limits

### Animation Optimization
- RequestAnimationFrame-based animation loop
- Configurable update triggers
- Efficient layer property updates

## Extending the System

### Adding New Visual Effects

1. Create a new generator method in `LayerGenerators`:

```javascript
static createCustomEffectLayer(id, data, options = {}) {
  const {
    // Define your options
    customOption = defaultValue
  } = options;

  return new CustomLayer({
    id: `custom-effect-${id}`,
    data,
    // Configure your layer
    getCustomProperty: d => d.customValue,
    // ... other properties
  });
}
```

2. Add the case to the PlotManager's `addLayer` method:

```javascript
case 'custom_effect':
  layer = LayerGenerators.createCustomEffectLayer(layerId, data, options);
  break;
```

### Adding New Event Types

1. Add keyword detection in `EventProcessor`:

```javascript
if (this.containsKeywords(lowerDesc, ['custom', 'event', 'keywords'])) {
  instructions.push(this.createCustomEventInstructions(coords, description));
}
```

2. Create the instruction generator method:

```javascript
createCustomEventInstructions(coords, description) {
  return {
    type: 'custom_effect',
    data: [{
      longitude: coords.lng,
      latitude: coords.lat,
      location: description
    }],
    options: {
      // Your custom options
    }
  };
}
```

## Troubleshooting

### Common Issues

1. **Layers not appearing**
   - Check that layers are being added to the DeckGL layers array
   - Verify coordinate data is valid
   - Ensure layer IDs are unique

2. **Animation not working**
   - Confirm animation loop is started
   - Check update triggers are properly configured
   - Verify animation functions are returning valid values

3. **Performance issues**
   - Limit the number of active layers
   - Use appropriate update triggers
   - Consider layer batching for large datasets

### Debug Tools

- Use `getLayerStats()` to monitor active layers
- Check browser console for layer creation logs
- Use the PlotManager Demo for testing

## API Reference

### PlotManager Methods

- `addLayer(eventInstruction)`: Add a new layer
- `removeLayer(layerId)`: Remove a specific layer
- `removeLayersByType(type)`: Remove all layers of a type
- `updateLayerData(layerId, newData)`: Update layer data
- `updateLayerOptions(layerId, newOptions)`: Update layer options
- `getAllLayers()`: Get all active layers
- `getLayerInfo(layerId)`: Get information about a specific layer
- `getLayersByType(type)`: Get all layers of a specific type
- `clearAllLayers()`: Remove all layers
- `getLayerStats()`: Get statistics about active layers
- `processEventBatch(instructions)`: Process multiple instructions

### EventProcessor Methods

- `processEvent(description)`: Process natural language description
- `extractLocation(text)`: Extract location from text
- `extractDirection(text)`: Extract direction from text
- `containsKeywords(text, keywords)`: Check for keywords

## License

This system is part of the Asterisk Globe project and follows the same licensing terms. 