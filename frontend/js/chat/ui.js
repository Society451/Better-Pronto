import { chatHeading } from './constants.js';

// -- UI INDICATORS & ANIMATIONS --

export function updateUnreadCounts() {
  document.querySelectorAll('.chat-item').forEach(chatItem => {
    const unreadCountElement = chatItem.querySelector('.unread-count');
    const unreadCount = parseInt(unreadCountElement.textContent, 10);
    const hasUnreadMentions = chatItem.getAttribute('data-has-unread-mentions') === 'true';
    const isDM = chatItem.getAttribute('data-is-dm') === 'true';

    unreadCountElement.style.display = unreadCount === 0 ? 'none' : 'inline-block';

    if (unreadCount > 0) {
      // Red for DMs and mentions, grey for regular unread messages
      unreadCountElement.style.backgroundColor = (isDM || hasUnreadMentions) ? 'red' : 'grey';
      unreadCountElement.style.color = 'white';
      unreadCountElement.textContent = unreadCount >= 100 ? '99+' : unreadCount;
    }
  });
}

export function setChatHeading(name) {
  chatHeading.textContent = name;
}

export function showLoading() {
  // Check if animation should be shown based on settings
  try {
    const savedSettings = safeLocalStorage().getItem('chatSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.showLoadingAnimation === false) {
        // Skip animation but still hide content
        const chatContainer = document.querySelector('.chat-container');
        const sidebar = document.querySelector('.sidebar');
        if (chatContainer) chatContainer.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        return;
      }
    }
  } catch (error) {
    console.error('Error checking animation setting:', error);
    // Continue with showing animation on error
  }

  const loadingScreen = document.getElementById('loading-screen');
  const chatContainer = document.querySelector('.chat-container');
  const sidebar = document.querySelector('.sidebar');

  loadingScreen.style.display = 'flex';
  loadingScreen.style.opacity = '1';

  if (chatContainer) chatContainer.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';
}

export function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const chatContainer = document.querySelector('.chat-container');
  const sidebar = document.querySelector('.sidebar');

  loadingScreen.style.opacity = '0';
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    if (chatContainer) chatContainer.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'block';
  }, 500);
}

export function setupAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .message-new { animation: fadeIn 0.3s ease-in; }
    .message-removing { animation: fadeOut 0.3s ease-out; }
    .message-updated { animation: highlight 1s ease-in-out; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    @keyframes highlight {
      0% { background-color: rgba(255, 255, 0, 0.5); }
      100% { background-color: transparent; }
    }
  `;
  document.head.appendChild(style);
}

export function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  return text.replace(new RegExp(`(${searchTerm})`, 'gi'), '<span class="highlight">$1</span>');
}

// -- SETTINGS PAGE MANAGEMENT --

export function showSettings() {
  const messagesContainer = document.getElementById('messages');
  const inputGroup = document.querySelector('.input-group');
  const chatHeadingElement = document.getElementById('chat-heading');

  // Hide chat UI
  [messagesContainer, inputGroup, chatHeadingElement].forEach(el => {
    if (el) el.style.display = 'none';
  });

  // Create or show settings container
  let settingsContainer = document.getElementById('settings-container');
  if (!settingsContainer) {
    settingsContainer = document.createElement('div');
    settingsContainer.id = 'settings-container';
    settingsContainer.className = 'settings-wrapper';
    messagesContainer.parentNode.insertBefore(settingsContainer, messagesContainer.nextSibling);
  }
  settingsContainer.style.display = 'block';

  // Load settings HTML - use relative path from current location
  fetch('../../html/settings.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      settingsContainer.innerHTML = html;
      const closeButton = document.getElementById('close-settings');
      if (closeButton) {
        closeButton.addEventListener('click', hideSettings);
      }
      
      // Import and initialize settings.js - use relative path
      import('../settings.js')
        .then(module => {
          if (typeof module.initializeSettings === 'function') {
            module.initializeSettings();
          }
        })
        .catch(error => {
          console.error('Error loading settings module:', error);
        });
    })
    .catch(error => {
      console.error('Error loading settings HTML:', error);
      
      // Try with another path format
      fetch('../html/settings.html')
        .then(response => response.ok ? response.text() : Promise.reject(`HTTP error in fallback! Status: ${response.status}`))
        .then(html => {
          settingsContainer.innerHTML = html;
          const closeButton = document.getElementById('close-settings');
          if (closeButton) {
            closeButton.addEventListener('click', hideSettings);
          }
          
          // Import and initialize settings.js
          import('../settings.js')
            .then(module => {
              if (typeof module.initializeSettings === 'function') {
                module.initializeSettings();
              }
            })
            .catch(error => {
              console.error('Error loading settings module:', error);
            });
        })
        .catch(err => {
          console.error('All attempts to load settings HTML failed:', err);
          // Fallback to inline HTML generation
          settingsContainer.innerHTML = getInlineSettingsHTML();
          const closeButton = document.getElementById('close-settings');
          if (closeButton) {
            closeButton.addEventListener('click', hideSettings);
          }
          
          // Import and initialize settings.js
          import('../settings.js')
            .then(module => {
              if (typeof module.initializeSettings === 'function') {
                module.initializeSettings();
              }
            })
            .catch(error => {
              console.error('Error loading settings module:', error);
            });
        });
    });
}

// Fallback function to generate inline HTML when fetching fails
function getInlineSettingsHTML() {
  return `
  <div class="settings-container">
    <div class="settings-header">
      <h2>Settings</h2>
      <button id="close-settings" class="close-settings-button" aria-label="Close settings">×</button>
    </div>
    
    <form id="settings-form">
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="setting-item">
          <label for="theme-select">Theme</label>
          <select id="theme-select" class="settings-select">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System Default</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="font-size">Font Size</label>
          <select id="font-size" class="settings-select">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="show-loading-animation">Show Loading Animation</label>
          <label class="switch">
            <input type="checkbox" id="show-loading-animation" checked>
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Notifications</h3>
        <div class="setting-item">
          <label for="enable-notifications">Enable Notifications</label>
          <label class="switch">
            <input type="checkbox" id="enable-notifications">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <label for="notification-sound">Notification Sound</label>
          <label class="switch">
            <input type="checkbox" id="notification-sound">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Chat</h3>
        <div class="setting-item">
          <label for="send-key">Send messages with</label>
          <select id="send-key" class="settings-select">
            <option value="enter">Enter</option>
            <option value="ctrl-enter">Ctrl+Enter</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="read-receipts">Show Read Receipts</label>
          <label class="switch">
            <input type="checkbox" id="read-receipts" checked>
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <label for="quick-delete">Quick Delete Messages</label>
          <label class="switch">
            <input type="checkbox" id="quick-delete">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="settings-footer">
        <button type="button" id="reset-settings" class="settings-button">Reset to Default</button>
        <button type="button" id="save-settings" class="settings-button primary">Save Settings</button>
      </div>
    </form>
  </div>
  `;
}

export function hideSettings() {
  const messagesContainer = document.getElementById('messages');
  const inputGroup = document.querySelector('.input-group');
  const settingsContainer = document.getElementById('settings-container');
  const chatHeadingElement = document.getElementById('chat-heading');

  // Show chat UI
  messagesContainer.style.display = 'flex';
  inputGroup.style.display = 'flex';
  chatHeadingElement.style.display = 'block';

  // Hide settings
  if (settingsContainer) settingsContainer.style.display = 'none';
}

// -- STORAGE & UTILITIES --

function safeLocalStorage() {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return localStorage;
  } catch (e) {
    console.warn('localStorage unavailable. Using memory storage fallback.');
    const memoryStorage = {};
    return {
      getItem: key => memoryStorage[key] || null,
      setItem: (key, value) => {
        memoryStorage[key] = value;
      },
      removeItem: key => {
        delete memoryStorage[key];
      }
    };
  }
}
