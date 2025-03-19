import { chatHeading } from './constants.js';

// Function to update unread count indicators
export function updateUnreadCounts() {
    document.querySelectorAll('.chat-item').forEach(chatItem => {
        const unreadCountElement = chatItem.querySelector('.unread-count');
        const unreadCount = parseInt(unreadCountElement.textContent, 10);
        const hasUnreadMentions = chatItem.getAttribute('data-has-unread-mentions') === 'true';
        const isDM = chatItem.getAttribute('data-is-dm') === 'true';
        
        if (unreadCount === 0) {
            unreadCountElement.style.display = 'none'; // Hide unread count bubble with 0 unread messages
        } else {
            unreadCountElement.style.display = 'inline-block'; // Show unread count bubble with unread messages
            
            // Set color based on message type - red for DMs and messages with mentions
            if (isDM) {
                unreadCountElement.style.backgroundColor = 'red'; // Red for DMs by default
                unreadCountElement.style.color = 'white';
            } else if (hasUnreadMentions) {
                unreadCountElement.style.backgroundColor = 'red'; // Red for unread mentions
                unreadCountElement.style.color = 'white';
            } else {
                unreadCountElement.style.backgroundColor = 'grey'; // Grey for regular unread messages
                unreadCountElement.style.color = 'white';
            }
            
            // Format count text to show "99+" for 100 or more unread messages
            unreadCountElement.textContent = unreadCount >= 100 ? '99+' : unreadCount;
        }
    });
}

// Function to set chat heading dynamically
export function setChatHeading(name) {
    chatHeading.textContent = name;
}

// Function to show loading animation and hide screen contents
export function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.querySelector('.sidebar');
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
    // Hide other UI elements
    if (chatContainer) chatContainer.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
}

// Function to hide loading animation with fade effect and show screen contents
export function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.querySelector('.sidebar');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        // Show the previously hidden UI elements
        if (chatContainer) chatContainer.style.display = 'flex';
        if (sidebar) sidebar.style.display = 'block';
    }, 500); // Match the transition duration
}

// Add CSS class for message animations
export function setupAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .message-new {
            animation: fadeIn 0.3s ease-in;
        }
        .message-removing {
            animation: fadeOut 0.3s ease-out;
        }
        .message-updated {
            animation: highlight 1s ease-in-out;
        }
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

// Add highlight function to highlight matching text
export function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Function to show settings page and hide messages
export function showSettings() {
    const messagesContainer = document.getElementById('messages');
    const inputGroup = document.querySelector('.input-group');
    const chatHeadingElement = document.getElementById('chat-heading');
    
    // Hide messages and input
    messagesContainer.style.display = 'none';
    inputGroup.style.display = 'none';
    chatHeadingElement.style.display = 'none';
    
    // Create settings container if it doesn't exist
    let settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) {
        settingsContainer = document.createElement('div');
        settingsContainer.id = 'settings-container';
        settingsContainer.className = 'settings-wrapper';
        
        // Add settings container after messages
        messagesContainer.parentNode.insertBefore(settingsContainer, messagesContainer.nextSibling);
    }
    
    // Show settings container
    settingsContainer.style.display = 'block';
    
    // Load settings HTML content
    fetch('../html/settings.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            settingsContainer.innerHTML = html;
            
            // Add event listener for close button
            const closeButton = document.getElementById('close-settings');
            if (closeButton) {
                closeButton.addEventListener('click', hideSettings);
            }
            
            console.log('Settings HTML loaded, initializing settings...');
            // Initialize settings functionality with a slight delay to ensure DOM is ready
            setTimeout(initializeSettings, 100);
        })
        .catch(error => {
            console.error('Error loading settings:', error);
            settingsContainer.innerHTML = getSettingsHTML();
            
            const closeButton = document.getElementById('close-settings');
            if (closeButton) {
                closeButton.addEventListener('click', hideSettings);
            }
            
            console.log('Using fallback settings HTML, initializing settings...');
            // Initialize settings functionality with a slight delay
            setTimeout(initializeSettings, 100);
        });
}

// Function to hide settings page and show messages
export function hideSettings() {
    const messagesContainer = document.getElementById('messages');
    const inputGroup = document.querySelector('.input-group');
    const settingsContainer = document.getElementById('settings-container');
    const chatHeadingElement = document.getElementById('chat-heading');
    
    // Show messages and input
    messagesContainer.style.display = 'flex';
    inputGroup.style.display = 'flex';
    chatHeadingElement.style.display = 'block';
    
    // Hide settings
    if (settingsContainer) {
        settingsContainer.style.display = 'none';
    }
}

// Function to safely access localStorage
function safeLocalStorage() {
    // Check if localStorage is available
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return localStorage;
    } catch (e) {
        console.warn('localStorage is not available. Using memory storage fallback.');
        // Create an in-memory fallback
        const memoryStorage = {};
        return {
            getItem: (key) => memoryStorage[key] || null,
            setItem: (key, value) => { memoryStorage[key] = value; },
            removeItem: (key) => { delete memoryStorage[key]; }
        };
    }
}

// Function to initialize settings functionality
function initializeSettings() {
    console.log('Initializing settings...');
    
    // Load saved settings
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-settings');
    const settingsForm = document.getElementById('settings-form');
    
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            console.log('Form submit event triggered');
            e.preventDefault();
            saveSettings();
        });
    }
    
    if (saveButton) {
        console.log('Save button found, attaching event listener');
        // Remove any existing event listeners to prevent duplicates
        saveButton.removeEventListener('click', saveSettingsHandler);
        // Add click event with direct handler instead of reference
        saveButton.addEventListener('click', saveSettingsHandler);
    } else {
        console.error('Save settings button not found in the DOM');
    }
    
    if (resetButton) {
        console.log('Reset button found, attaching event listener');
        // Remove any existing event listeners to prevent duplicates
        resetButton.removeEventListener('click', resetSettingsHandler);
        // Add click event with direct handler
        resetButton.addEventListener('click', resetSettingsHandler);
    } else {
        console.error('Reset settings button not found in the DOM');
    }
    
    // Load saved settings values
    loadSavedSettings();
    
    // Add test button        
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Backend Connection';
    testButton.className = 'settings-button';
    testButton.style.backgroundColor = '#ff9800';
    testButton.style.color = 'white';
    testButton.style.marginTop = '10px';
    testButton.addEventListener('click', function() {
        testBackendConnection();
    });
    
    const footer = document.querySelector('.settings-footer');
    if (footer) {
        footer.appendChild(testButton);
    }
    
    // Add debug button
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Debug Settings (Print to Console)';
    debugButton.className = 'settings-button';
    debugButton.style.backgroundColor = '#007bff';
    debugButton.style.color = 'white';
    debugButton.style.marginTop = '10px';
    debugButton.addEventListener('click', function() {
        try {
            const storage = safeLocalStorage();
            const settings = storage.getItem('chatSettings');
            console.log('Current settings:', settings);
            alert('Settings logged to console:\n' + (settings || 'No settings found'));
        } catch (error) {
            console.error('Error accessing settings:', error);
            alert('Error accessing settings: ' + error.message);
        }
    });
    
    if (footer) {
        footer.appendChild(debugButton);
    }
}

// Handler functions to ensure proper event binding
function saveSettingsHandler(e) {
    console.log('Save settings button clicked');
    e.preventDefault();
    saveSettings();
}

function resetSettingsHandler(e) {
    console.log('Reset settings button clicked');
    e.preventDefault();
    resetSettings();
}

// Function to save settings
function saveSettings() {
    console.log('saveSettings function called');
    
    const theme = document.getElementById('theme-select')?.value || 'light';
    const fontSize = document.getElementById('font-size')?.value || 'medium';
    const enableNotifications = document.getElementById('enable-notifications')?.checked || false;
    const notificationSound = document.getElementById('notification-sound')?.checked || false;
    const sendKey = document.getElementById('send-key')?.value || 'enter';
    const readReceipts = document.getElementById('read-receipts')?.checked || false;
    const quickDelete = document.getElementById('quick-delete')?.checked || false;
    
    // Create settings object
    const settings = {
        theme,
        fontSize,
        enableNotifications,
        notificationSound,
        sendKey,
        readReceipts,
        quickDelete
    };
    
    console.log('Saving settings to backend:', settings);
    
    // Save to localStorage first as backup with error handling
    try {
        const storage = safeLocalStorage();
        storage.setItem('chatSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
    
    // Then try to save to server
    if (window.pywebview && window.pywebview.api) {
        // Add immediate feedback
        console.log('PyWebView API available - Sending settings to Python backend...');
        
        try {
            const saveButton = document.getElementById('save-settings');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = 'Saving...';
                saveButton.style.opacity = '0.7';
            }
            
            // Call the Python backend
            window.pywebview.api.save_settings(settings)
                .then(response => {
                    console.log('Backend save_settings response:', response);
                    
                    // Reset button state
                    document.body.style.cursor = 'default';
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = 'Save Settings';
                        saveButton.style.opacity = '1';
                    }
                    
                    if (response && response.ok) {
                        console.log('SUCCESS: Settings saved to backend');
                        // Show success notification
                        const successNotice = document.createElement('div');
                        successNotice.textContent = 'Settings saved successfully!';
                        successNotice.style.backgroundColor = '#4CAF50';
                        successNotice.style.color = 'white';
                        successNotice.style.padding = '10px';
                        successNotice.style.marginTop = '10px';
                        successNotice.style.borderRadius = '5px';
                        successNotice.style.textAlign = 'center';
                        
                        const footer = document.querySelector('.settings-footer');
                        footer.appendChild(successNotice);
                        
                        setTimeout(() => {
                            successNotice.remove();
                        }, 3000);
                        
                        alert('Settings saved successfully to server');
                    } else {
                        console.error('FAILED: Backend could not save settings:', response);
                        alert('Error: Failed to save settings to server. See console for details.');
                    }
                })
                .catch(error => {
                    console.error('Error in API call to save_settings:', error);
                    alert('Error saving settings: ' + (error.message || 'Unknown error'));
                    
                    // Reset button state
                    document.body.style.cursor = 'default';
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = 'Save Settings';
                        saveButton.style.opacity = '1';
                    }
                });
        } catch (e) {
            console.error('Exception when calling save_settings:', e);
            alert('Exception: ' + e.message);
            document.body.style.cursor = 'default';
        }
    } else {
        console.warn('PyWebView API not available - settings only saved locally');
        alert('PyWebView API not available - settings only saved locally');
    }
    
    // Apply settings immediately
    applySettings(settings);
    
    console.log('saveSettings function called - END');
    return false; // Prevent form submission
}

// Function to reset settings to default
function resetSettings() {
    const defaultSettings = {
        theme: 'light',
        fontSize: 'medium',
        enableNotifications: true,
        notificationSound: true,
        sendKey: 'enter',
        readReceipts: true,
        quickDelete: false
    };
    
    // Update form values
    document.getElementById('theme-select').value = defaultSettings.theme;
    document.getElementById('font-size').value = defaultSettings.fontSize;
    document.getElementById('enable-notifications').checked = defaultSettings.enableNotifications;
    document.getElementById('notification-sound').checked = defaultSettings.notificationSound;
    document.getElementById('send-key').value = defaultSettings.sendKey;
    document.getElementById('read-receipts').checked = defaultSettings.readReceipts;
    document.getElementById('quick-delete').checked = defaultSettings.quickDelete;
    
    // Save to localStorage with error handling
    try {
        const storage = safeLocalStorage();
        storage.setItem('chatSettings', JSON.stringify(defaultSettings));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
    
    // Show success toast
    import('./message.js').then(module => {
        module.Toast.show('Settings reset to default', 'info', 3000);
    });
    
    // Apply settings immediately
    applySettings(defaultSettings);
}

// Function to test backend connection
function testBackendConnection() {
    if (window.pywebview && window.pywebview.api) {
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
        };
        
        console.log('Sending test data to backend:', testData);
        
        window.pywebview.api.save_settings(testData)
            .then(response => {
                console.log('Backend test response:', response);
                alert('Backend test response: ' + JSON.stringify(response));
            })
            .catch(error => {
                console.error('Backend test error:', error);
                alert('Backend test error: ' + error.message);
            });
    } else {
        console.warn('PyWebview API not available');
        alert('PyWebview API not available for testing');
    }
}

// Function to load saved settings with better error handling
function loadSavedSettings() {
    // First try to load from API
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.load_settings()
            .then(settings => {
                if (settings && typeof settings === 'object') {
                    console.log('Settings loaded from server:', settings);
                    applySettingsToForm(settings);
                    applySettings(settings);
                    // Also save to localStorage as backup with error handling
                    try {
                        const storage = safeLocalStorage();
                        storage.setItem('chatSettings', JSON.stringify(settings));
                    } catch (error) {
                        console.error('Error saving to localStorage:', error);
                    }
                } else {
                    console.warn('Invalid or empty settings returned from API:', settings);
                    // Fall back to localStorage if API returns nothing valid
                    fallbackToLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error loading settings from server:', error);
                // Fall back to localStorage
                fallbackToLocalStorage();
            });
    } else {
        console.warn('PyWebView API not available, falling back to localStorage');
        fallbackToLocalStorage();
    }
}

// Helper function to fall back to localStorage settings with better validation
function fallbackToLocalStorage() {
    let settings = null;
    
    try {
        const storage = safeLocalStorage();
        const savedSettings = storage.getItem('chatSettings');
        
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
            if (typeof settings === 'object' && settings !== null) {
                console.log('Settings loaded from localStorage:', settings);
                applySettingsToForm(settings);
                applySettings(settings);
                return;
            }
            console.warn('Invalid settings format in localStorage');
        }
    } catch (e) {
        console.error('Error accessing or parsing localStorage settings:', e);
    }
    
    // If we get here, either localStorage had no settings or they were invalid
    // Use default settings
    const defaultSettings = {
        theme: 'light',
        fontSize: 'medium',
        enableNotifications: true,
        notificationSound: true,
        sendKey: 'enter',
        readReceipts: true,
        quickDelete: false
    };
    
    console.log('Using default settings:', defaultSettings);
    applySettingsToForm(defaultSettings);
    applySettings(defaultSettings);
    
    // Save default settings to localStorage and potentially to server with error handling
    try {
        const storage = safeLocalStorage();
        storage.setItem('chatSettings', JSON.stringify(defaultSettings));
    } catch (error) {
        console.error('Error saving default settings to localStorage:', error);
    }
    
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.save_settings(defaultSettings)
            .then(response => {
                if (response && response.ok) {
                    console.log('Default settings saved to server');
                } else {
                    console.warn('Failed to save default settings to server');
                }
            })
            .catch(err => {
                console.error('Error saving default settings to server:', err);
            });
    }
}

// Helper function to apply settings to form elements
function applySettingsToForm(settings) {
    if (document.getElementById('theme-select')) document.getElementById('theme-select').value = settings.theme || 'light';
    if (document.getElementById('font-size')) document.getElementById('font-size').value = settings.fontSize || 'medium';
    if (document.getElementById('enable-notifications')) document.getElementById('enable-notifications').checked = settings.enableNotifications !== false;
    if (document.getElementById('notification-sound')) document.getElementById('notification-sound').checked = settings.notificationSound !== false;
    if (document.getElementById('send-key')) document.getElementById('send-key').value = settings.sendKey || 'enter';
    if (document.getElementById('read-receipts')) document.getElementById('read-receipts').checked = settings.readReceipts !== false;
    if (document.getElementById('quick-delete')) document.getElementById('quick-delete').checked = settings.quickDelete === true;
}

// Function to apply settings
function applySettings(settings) {
    // Apply font size
    let fontSizeValue;
    switch (settings.fontSize) {
        case 'small':
            fontSizeValue = '14px';
            break;
        case 'large':
            fontSizeValue = '18px';
            break;
        default:
            fontSizeValue = '16px';
    }
    document.documentElement.style.fontSize = fontSizeValue;
    
    // Apply theme
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Function to get settings HTML content as a fallback
function getSettingsHTML() {
    return `
    <div class="settings-container">
        <div class="settings-header">
            <h2>Settings</h2>
            <button id="close-settings" class="close-settings-button">&times;</button>
        </div>
        
        <div class="settings-section">
            <h3>Appearance</h3>
            <div class="setting-item">
                <label for="theme-select">Theme:</label>
                <select id="theme-select" class="settings-select">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                </select>
            </div>
            
            <div class="setting-item">
                <label for="font-size">Font Size:</label>
                <select id="font-size" class="settings-select">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                </select>
            </div>
        </div>
        
        <div class="settings-section">
            <h3>Notifications</h3>
            <div class="setting-item">
                <label for="enable-notifications">Enable Notifications:</label>
                <label class="switch">
                    <input type="checkbox" id="enable-notifications">
                    <span class="slider round"></span>
                </label>
            </div>
            
            <div class="setting-item">
                <label for="notification-sound">Notification Sound:</label>
                <label class="switch">
                    <input type="checkbox" id="notification-sound">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        
        <div class="settings-section">
            <h3>Chat</h3>
            <div class="setting-item">
                <label for="send-key">Send messages with:</label>
                <select id="send-key" class="settings-select">
                    <option value="enter">Enter</option>
                    <option value="ctrl-enter">Ctrl+Enter</option>
                </select>
            </div>
            <div class="setting-item">
                <label for="read-receipts">Show Read Receipts:</label>
                <label class="switch">
                    <input type="checkbox" id="read-receipts" checked>
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="setting-item">
                <label for="quick-delete">Quick Delete Messages:</label>
                <label class="switch">
                    <input type="checkbox" id="quick-delete">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        
        <div class="settings-footer">
            <button id="save-settings" class="settings-button primary">Save Settings</button>
            <button id="reset-settings" class="settings-button">Reset to Default</button>
        </div>
    </div>
    `;
}
