/**
 * GitHub Comment Hider - Popup Logic
 * This script handles the extension popup UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get references to UI elements
  const enabledToggle = document.getElementById('enabled');
  const usernameInput = document.getElementById('username');
  const addUserButton = document.getElementById('add-user');
  const usersListContainer = document.getElementById('users-list');
  const saveButton = document.getElementById('save');
  const hiddenCountSpan = document.getElementById('hidden-count');
  
  // Store the list of users to hide
  let usersToHide = [];
  
  // Load current settings
  browser.storage.local.get(['enabled', 'usersToHide'], (result) => {
    if (result.enabled !== undefined) {
      enabledToggle.checked = result.enabled;
    }
    
    // Handle both new 'usersToHide' array and legacy 'targetUsername' string
    if (result.usersToHide && Array.isArray(result.usersToHide)) {
      usersToHide = result.usersToHide;
    } else {
      // Check for legacy single username format
      browser.storage.local.get(['targetUsername'], (legacyResult) => {
        if (legacyResult.targetUsername) {
          usersToHide = [legacyResult.targetUsername];
        } else {
          // Default to 'Copilot' if no users are found
          usersToHide = ['Copilot'];
        }
        updateUsersList();
      });
    }
    
    updateUsersList();
  });

  // Request current stats from the background script
  browser.runtime.sendMessage({ action: 'getStats' })
    .then(response => {
      if (response) {
        updateStats(response.hiddenComments);
      }
    })
    .catch(error => {
      console.log("Error getting stats:", error);
    });
  
  // Add user button click handler
  addUserButton.addEventListener('click', () => {
    addUser();
  });
  
  // Allow Enter key to add a user
  usernameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      addUser();
    }
  });
  
  // Save settings when the save button is clicked
  saveButton.addEventListener('click', () => {
    const enabled = enabledToggle.checked;
    
    // Create config message
    const configMessage = {
      action: 'updateConfig',
      enabled: enabled,
      usersToHide: usersToHide
    };
    
    // Save to storage
    browser.storage.local.set({
      enabled: enabled,
      usersToHide: usersToHide
    });
    
    // Send update to background script
    browser.runtime.sendMessage(configMessage)
      .then(response => {
        if (response && response.success) {
          // Provide visual feedback that settings were saved
          saveButton.textContent = 'Saved!';
          setTimeout(() => {
            saveButton.textContent = 'Save Settings';
          }, 1500);
        }
      })
      .catch(error => {
        console.log("Error updating config:", error);
        alert("There was an error saving settings. Please try again.");
      });
  });
  
  // Listen for stat updates from background script
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'statsUpdate') {
      updateStats(message.hiddenComments);
    }
    return true;
  });
  
  // Function to add a user to the list
  function addUser() {
    const username = usernameInput.value.trim();
    
    // Validate username
    if (!username) {
      alert('Please enter a username to hide comments from');
      return;
    }
    
    // Check if user is already in the list (case insensitive)
    if (usersToHide.some(user => user.toLowerCase() === username.toLowerCase())) {
      alert(`User "${username}" is already in your hide list`);
      return;
    }
    
    // Add the user to the list
    usersToHide.push(username);
    
    // Update the UI
    updateUsersList();
    
    // Clear the input field
    usernameInput.value = '';
    usernameInput.focus();
  }
  
  // Function to remove a user from the list
  function removeUser(username) {
    usersToHide = usersToHide.filter(user => user !== username);
    updateUsersList();
  }
  
  // Function to update the users list in the UI
  function updateUsersList() {
    // Clear the current list
    usersListContainer.innerHTML = '';
    
    if (usersToHide.length === 0) {
      // Show empty message if no users
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-list-message';
      emptyMessage.textContent = 'No users added yet';
      usersListContainer.appendChild(emptyMessage);
    } else {
      // Add each user to the list
      usersToHide.forEach(username => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const userNameSpan = document.createElement('span');
        userNameSpan.className = 'user-name';
        userNameSpan.textContent = username;
        userItem.appendChild(userNameSpan);
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeUser(username));
        userItem.appendChild(removeButton);
        
        usersListContainer.appendChild(userItem);
      });
    }
  }
});

// Function to update the stats display
function updateStats(hiddenCount) {
  const hiddenCountSpan = document.getElementById('hidden-count');
  if (hiddenCountSpan) {
    hiddenCountSpan.textContent = hiddenCount || 0;
  }
}
