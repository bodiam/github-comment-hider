/**
 * GitHub Comment Hider
 * This script hides comments made by specified users on GitHub
 */

// Configuration object
let config = {
  enabled: true,
  usersToHide: ['Copilot'], // Default user to hide
  hiddenComments: 0
};

// Store hidden comments to easily show them again
let hiddenCommentElements = [];

// Load configuration from storage
browser.storage.local.get(['enabled', 'usersToHide', 'targetUsername'], (result) => {
  if (result.enabled !== undefined) {
    config.enabled = result.enabled;
  }
  
  // Handle both new array format and legacy single username
  if (result.usersToHide && Array.isArray(result.usersToHide)) {
    config.usersToHide = result.usersToHide;
  } else if (result.targetUsername) {
    // Legacy support for single username
    config.usersToHide = [result.targetUsername];
  }
  
  // Initial run to hide comments
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(hideComments, 500); // Small delay to ensure DOM is fully loaded
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(hideComments, 500);
    });
  }
});

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStats') {
    sendResponse({ hiddenComments: config.hiddenComments });
    return true;
  } else if (message.action === 'updateConfig') {
    if (message.enabled !== undefined) {
      config.enabled = message.enabled;
    }
    if (message.usersToHide !== undefined) {
      config.usersToHide = message.usersToHide;
    } else if (message.targetUsername !== undefined) {
      // Legacy support for single username
      config.usersToHide = [message.targetUsername];
    }
    
    // Apply changes immediately
    if (config.enabled) {
      hideComments();
    } else {
      showComments();
    }
    
    // Send response if callback exists
    if (sendResponse) {
      sendResponse({ success: true });
    }
    return true;
  }
  return true;
});

// Helper function to send stats updates to the background script
function sendStatsUpdate() {
  // Avoid sending messages if we're unloading the page
  if (document.hidden || document.visibilityState === 'hidden') return;
  
  try {
    // Use a simple fire-and-forget approach that doesn't require a response
    // This avoids the "promised response went out of scope" error
    browser.runtime.sendMessage({ 
      action: 'statsUpdate', 
      hiddenComments: config.hiddenComments 
    }).then(() => {
      // Success, but we don't need to do anything
    }).catch(error => {
      // Only log if it's not a disconnect error, which is normal during page navigation
      if (!error.message.includes('disconnected')) {
        console.log("Stats update error:", error);
      }
    });
  } catch (error) {
    // Only log serious errors
    console.log("Error sending message to background:", error);
  }
}

// Function to hide comments made by the users in our hide list
function hideComments() {
  if (!config.enabled) return;
  
  // Reset counter and hidden elements
  config.hiddenComments = 0;
  hiddenCommentElements = [];

  // Simple approach: Find all TimelineItem elements that contain any of the target usernames
  const timelineItems = document.querySelectorAll('.js-timeline-item, .TimelineItem');
  
  console.log(`Looking for comments from users: ${config.usersToHide.join(', ')}`);
  console.log(`Found ${timelineItems.length} timeline items to check`);
  
  timelineItems.forEach(item => {
    // Look for author elements in this timeline item
    const authorElements = item.querySelectorAll('a.author');
    
    let foundTargetAuthor = false;
    let matchedUser = '';
    
    // Check each author element against all users in our hide list
    for (const authorElement of authorElements) {
      const authorName = authorElement.textContent.trim();
      
      // Check if the author is in our list of users to hide (case insensitive)
      for (const userToHide of config.usersToHide) {
        if (authorName.toLowerCase() === userToHide.toLowerCase()) {
          foundTargetAuthor = true;
          matchedUser = userToHide;
          console.log(`Found match for author: ${authorName}`);
          break;
        }
      }
      
      if (foundTargetAuthor) break;
    }
    
    // If we found a target author in this timeline item, hide it
    if (foundTargetAuthor) {
      // Don't rehide if already hidden
      if (item.style.display === 'none') return;
      
      console.log('Hiding comment from:', matchedUser);
      
      // Save original display
      item.dataset.originalDisplay = item.style.display || '';
      
      // Hide the entire timeline item
      item.style.display = 'none';
      
      // Track the hidden element
      hiddenCommentElements.push(item);
      config.hiddenComments++;
    }
  });
  
  // If we didn't find any with the specific class, try a broader approach
  if (config.hiddenComments === 0) {
    // Look for any elements that contain an author link with any of the target usernames
    const allAuthorLinks = document.querySelectorAll('a[data-hovercard-type="user"]');
    
    console.log(`Broader search: found ${allAuthorLinks.length} author links`);
    
    allAuthorLinks.forEach(authorLink => {
      const authorName = authorLink.textContent.trim();
      let isUserToHide = false;
      let matchedUser = '';
      
      // Check if this author is in our list of users to hide
      for (const userToHide of config.usersToHide) {
        if (authorName.toLowerCase() === userToHide.toLowerCase()) {
          isUserToHide = true;
          matchedUser = userToHide;
          break;
        }
      }
      
      if (isUserToHide) {
        // Find the containing comment or timeline item
        const container = authorLink.closest('.js-timeline-item, .TimelineItem, .js-comment-container');
        
        if (container && container.style.display !== 'none') {
          console.log('Hiding comment (broader approach) from:', matchedUser);
          
          // Save original display
          container.dataset.originalDisplay = container.style.display || '';
          
          // Hide the container
          container.style.display = 'none';
          
          // Track the hidden element
          hiddenCommentElements.push(container);
          config.hiddenComments++;
        }
      }
    });
  }
  
  console.log(`Hidden ${config.hiddenComments} comments from users in hide list`);
  
  // Send stats update
  sendStatsUpdate();
}

// Function to show previously hidden comments
function showComments() {
  // Restore all hidden comments using our saved array
  hiddenCommentElements.forEach(comment => {
    // Restore original display value if available
    comment.style.display = comment.dataset.originalDisplay || '';
  });
  
  // Clear our tracking arrays and counters
  hiddenCommentElements = [];
  config.hiddenComments = 0;
  
  // Send update to background script
  sendStatsUpdate();
}

// Setup debounced hide function to avoid excessive processing
const debounce = (func, delay) => {
  let timeoutId;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
};

const debouncedHideComments = debounce(hideComments, 300);

// Handle initial page load and subsequent navigation (GitHub is a SPA)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // Initial run with a delay to ensure GitHub's JS has processed the DOM
  setTimeout(hideComments, 1000);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hideComments, 1000);
  });
}

// Also run whenever the URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(hideComments, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Add a MutationObserver to handle dynamically loaded comments
const commentObserver = new MutationObserver((mutations) => {
  let shouldUpdate = false;
  
  // Check if relevant elements were added
  for (let mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any of the added nodes might be comments
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Look for elements that might contain comments
          if (node.classList && (
              node.classList.contains('js-comment-container') ||
              node.classList.contains('js-timeline-item') ||
              node.classList.contains('TimelineItem') ||
              node.classList.contains('review-comment')
          )) {
            shouldUpdate = true;
            break;
          }
        }
      }
      
      if (shouldUpdate) break;
    }
  }
  
  // Only update if relevant elements were found
  if (shouldUpdate && config.enabled) {
    debouncedHideComments();
  }
});

// Start observing the document body for added nodes
commentObserver.observe(document.body, { childList: true, subtree: true });
