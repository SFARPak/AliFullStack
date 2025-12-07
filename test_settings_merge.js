
// Mock dependencies
const currentSettings = {
  providerSettings: {
    openai: { apiKey: { value: "old-openai-key" } },
    anthropic: { apiKey: { value: "old-anthropic-key" } },
  },
  otherSetting: "value",
};

// Simulate writeSettings logic
function simulateWriteSettings(settings) {
  // Current logic in src/main/settings.ts
  const newSettings = { ...currentSettings, ...settings };
  
  console.log("New Settings:", JSON.stringify(newSettings, null, 2));
  return newSettings;
}

// Test Case 1: Frontend sends complete providerSettings (expected behavior)
console.log("--- Test Case 1: Frontend sends complete providerSettings ---");
const frontendSettings1 = {
  providerSettings: {
    openai: { apiKey: { value: "new-openai-key" } },
    anthropic: { apiKey: { value: "old-anthropic-key" } },
  },
};
simulateWriteSettings(frontendSettings1);

// Test Case 2: Frontend sends partial providerSettings (e.g. if state was incomplete)
console.log("\n--- Test Case 2: Frontend sends partial providerSettings ---");
const frontendSettings2 = {
  providerSettings: {
    openai: { apiKey: { value: "new-openai-key" } },
    // anthropic is missing!
  },
};
simulateWriteSettings(frontendSettings2);

// Proposed Fix Logic
function simulateWriteSettingsFixed(settings) {
  const newSettings = { ...currentSettings, ...settings };
  
  // Deep merge providerSettings
  if (settings.providerSettings) {
    newSettings.providerSettings = {
      ...currentSettings.providerSettings,
      ...settings.providerSettings,
    };
  }
  
  console.log("New Settings (Fixed):", JSON.stringify(newSettings, null, 2));
  return newSettings;
}

console.log("\n--- Test Case 3: Fixed Logic with partial providerSettings ---");
simulateWriteSettingsFixed(frontendSettings2);
