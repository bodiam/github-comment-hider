/**
 * GitHub Comment Hider - Background Script
 * This script handles communication between the popup and content scripts
 */

// Initialize default settings if not already set
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['enabled', 'usersToHide', 'targetUsername'], (result) => {
    const updates = {};
    
    // Set default enabled state if not present
    if (result.enabled === undefined) {
      updates.enabled = true;
    }
    
    // Handle migration from single user to array of users
    if (!result.usersToHide) {
      if (result.targetUsername) {
        // Migrate the single username to an array
        updates.usersToHide = [result.targetUsername];
        // We can keep the old property for backward compatibility
      } else {
        // Default list with Copilot
        updates.usersToHide = ['Copilot'];
        updates.targetUsername = 'Copilot'; // For backward compatibility
      }
    }
    
    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      browser.storage.local.set(updates);
    }
  });
});

// Store stats from content script 
let currentStats = {
  hiddenComments: 0
};

// Handle messages from content script and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Messages from content script updating stats
  if (message.action === 'statsUpdate') {
    currentStats.hiddenComments = message.hiddenComments;
    sendResponse({ success: true }); // Always send a response
    return true;
  }
  
  // Messages from popup requesting stats
  if (message.action === 'getStats') {
    sendResponse(currentStats);
    return true;
  }
  
  // Messages from popup to update content script configuration
  if (message.action === 'updateConfig') {
    // Forward the message to all GitHub tabs
    browser.tabs.query({ url: '*://github.com/*' }, (tabs) => {
      for (const tab of tabs) {
        browser.tabs.sendMessage(tab.id, message)
          .catch(error => console.log("Error sending message to tab:", error));
      }
    });
    
    // Also save to storage
    const updatedConfig = {};
    if (message.enabled !== undefined) updatedConfig.enabled = message.enabled;
    if (message.usersToHide !== undefined) {
      updatedConfig.usersToHide = message.usersToHide;
      
      // For backward compatibility, also set the first user as targetUsername
      if (message.usersToHide.length > 0) {
        updatedConfig.targetUsername = message.usersToHide[0];
      }
    }
    
    browser.storage.local.set(updatedConfig);
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});
