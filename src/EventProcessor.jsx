import React, { useCallback } from 'react';
import { usePlotManager } from './PlotManager';

// Enhanced event processor that converts natural language to PlotManager instructions
class EventProcessor {
  constructor(plotManager) {
    this.plotManager = plotManager;
  }

  async processEvent(description) {
    const lowerDesc = description.toLowerCase();
    const instructions = [];
    // Arc event
    if (lowerDesc.includes('missile') || lowerDesc.includes('arc') || lowerDesc.includes('launch')) {
      // Parse "from X to Y and Z" or "from X to Y, Z" pattern
      const match = description.match(/from ([^ ]+) to (.+)/i);
      if (match) {
        const from = match[1].trim();
        // Split destinations on 'and' or ','
        const toRaw = match[2].replace(/\band\b/gi, ',');
        const destinations = toRaw.split(',').map(s => s.trim()).filter(Boolean);
        for (const to of destinations) {
          instructions.push({ type: 'arc', from, to });
        }
      }
    } else {
      // Pulsing dot event (earthquake, event, etc.)
      // Parse "in LOCATION" or fallback to city list
      const match = description.match(/in ([^,]+)(?:,|$)/i);
      let location = 'Tokyo';
      if (match) location = match[1].trim();
      instructions.push({ type: 'pulsing_dot', location });
    }
    // Pass instructions to PlotManager
    return this.plotManager.processEventBatch(instructions);
  }
}

// React hook for using the EventProcessor
export const useEventProcessor = () => {
  const plotManager = usePlotManager();
  return React.useMemo(() => new EventProcessor(plotManager), [plotManager]);
};

export { EventProcessor }; 