# AI Agent Customization Guide

## Overview

Your 3D Globe project now features an intelligent AI agent that can process natural language input and convert it into visual events on the globe. The agent is designed to be highly customizable, allowing you to define its personality, capabilities, and behavior.

## Quick Start

To customize your AI agent, simply edit the `src/agentConfig.js` file. The main configuration is in the `AGENT_CONFIG` object.

## Configuration Options

### 1. System Prompt (`AGENT_CONFIG.systemPrompt`)

This is where you define your custom prompt. The current prompt includes:

- **Context Understanding**: The agent analyzes user intent
- **Event Classification**: Identifies different types of events
- **Location Intelligence**: Extracts and validates locations
- **Data Extraction**: Pulls structured data from natural language
- **Response Format**: Defines the JSON structure for responses
- **Error Handling**: Provides helpful guidance for unclear inputs

### 2. Temperature (`AGENT_CONFIG.temperature`)

Controls the randomness of responses:
- `0.0`: Very deterministic, consistent responses
- `0.1`: Slightly creative while maintaining consistency (current setting)
- `1.0`: Very creative and varied responses

### 3. Supported Actions (`AGENT_CONFIG.supportedActions`)

Defines what actions the agent can perform:
- `plot_event`: Plot a single event at a location
- `plot_arc`: Plot a connection between two locations
- `get_info`: Provide information or guidance
- `error`: Handle error conditions

### 4. Default Values (`AGENT_CONFIG.defaults`)

Sets default values for events when not specified:
- `magnitude`: Default intensity (5.0)
- `eventType`: Default event type ('event')
- `arcType`: Default arc type ('arc')

### 5. Capabilities (`AGENT_CONFIG.capabilities`)

Defines what the agent can do:
- `canPlotEvents`: Can plot single events
- `canPlotArcs`: Can plot connections between locations
- `canProvideInfo`: Can provide information and guidance
- `canHandleAmbiguousInput`: Can handle unclear inputs
- `canSuggestAlternatives`: Can suggest alternatives when needed

## Custom Event Types

You can define custom event types in the `EVENT_TYPES` object:

```javascript
export const EVENT_TYPES = {
  earthquake: {
    defaultMagnitude: 5.0,
    color: [255, 0, 0],
    description: "Seismic activity"
  },
  // Add your custom event types here
};
```

## Response Format

The agent always responds with JSON containing:

```javascript
{
  "action": "plot_event" | "plot_arc" | "get_info" | "error",
  "eventType": "string", // Optional
  "location": "string", // For single events
  "from": "string", // For arc events
  "to": "string", // For arc events
  "magnitude": number, // Optional
  "metadata": {}, // Additional information
  "message": "string" // Human-readable response
}
```

## Example Customizations

### 1. More Conversational Agent

```javascript
systemPrompt: `You are a friendly AI assistant that helps users visualize global events on a 3D globe. You should be conversational, helpful, and always provide context about what you're doing. When users ask questions, be informative and guide them toward plotting interesting events...`
```

### 2. Specialized for Military Events

```javascript
systemPrompt: `You are a military intelligence AI agent specialized in tracking and visualizing military activities, conflicts, and strategic movements on a 3D globe. You excel at identifying military events, troop movements, missile launches, and geopolitical tensions...`
```

### 3. Environmental Focus

```javascript
systemPrompt: `You are an environmental monitoring AI agent that tracks climate events, natural disasters, and environmental changes on a 3D globe. You specialize in earthquakes, hurricanes, wildfires, volcanic eruptions, and climate-related phenomena...`
```

## Testing Your Customizations

1. Edit the `src/agentConfig.js` file
2. Save the changes
3. The application will automatically reload
4. Test your agent with various inputs in the terminal chat

## Tips for Effective Prompts

1. **Be Specific**: Clearly define what the agent should do
2. **Provide Examples**: Include input/output examples in your prompt
3. **Define Boundaries**: Specify what the agent can and cannot do
4. **Error Handling**: Include instructions for handling unclear inputs
5. **Response Format**: Always specify the exact JSON structure expected

## Advanced Customization

For more advanced customization, you can:

1. Add new action types to `supportedActions`
2. Create custom event type definitions
3. Modify the response parsing logic in `App.jsx`
4. Add new capabilities to the agent
5. Implement custom validation rules

## Troubleshooting

If your agent isn't working as expected:

1. Check the browser console for errors
2. Verify your JSON response format matches the expected structure
3. Test with simple inputs first
4. Ensure your prompt includes clear examples
5. Check that the temperature setting is appropriate for your use case

## Need Help?

The agent system is designed to be flexible and extensible. If you need help with specific customizations or encounter issues, the configuration is well-documented and modular for easy debugging and modification. 