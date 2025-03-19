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
    
    // Load settings HTML
    fetch('../html/settings.html')
        .then(response => response.ok ? response.text() : Promise.reject(`HTTP error! Status: ${response.status}`))
        .then(html => {
            settingsContainer.innerHTML = html;
            const closeButton = document.getElementById('close-settings');
            if (closeButton) closeButton.addEventListener('click', hideSettings);
            
            setTimeout(initializeSettings, 100);
        })
        .catch(error => {
            console.error('Error loading settings:', error);
            settingsContainer.innerHTML = getSettingsHTML();
            
            const closeButton = document.getElementById('close-settings');
            if (closeButton) closeButton.addEventListener('click', hideSettings);
            
            setTimeout(initializeSettings, 100);
        });
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
            getItem: (key) => memoryStorage[key] || null,
            setItem: (key, value) => { memoryStorage[key] = value; },
            removeItem: (key) => { delete memoryStorage[key]; }
        };
    }
}

// -- SETTINGS MANAGEMENT --

function initializeSettings() {
    const settingsForm = document.getElementById('settings-form');
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-settings');
    
    // Set up form handlers
    if (settingsForm) {
        settingsForm.addEventListener('submit', e => {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // Set up button handlers with cleanup to prevent duplicates
    if (saveButton) {
        saveButton.removeEventListener('click', saveSettingsHandler);
        saveButton.addEventListener('click', saveSettingsHandler);
    }
    
    if (resetButton) {
        resetButton.removeEventListener('click', resetSettingsHandler);
        resetButton.addEventListener('click', resetSettingsHandler);
    }
    
    // Load saved settings
    loadSavedSettings();
    
    // Add utility buttons
    const footer = document.querySelector('.settings-footer');
    if (footer) {
        // Test button
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Backend Connection';
        testButton.className = 'settings-button';
        testButton.style.cssText = 'background-color: #ff9800; color: white; margin-top: 10px;';
        testButton.addEventListener('click', testBackendConnection);
        footer.appendChild(testButton);
        
        // Debug button
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Debug Settings (Print to Console)';
        debugButton.className = 'settings-button';
        debugButton.style.cssText = 'background-color: #007bff; color: white; margin-top: 10px;';
        debugButton.addEventListener('click', () => {
            try {
                const settings = safeLocalStorage().getItem('chatSettings');
                console.log('Current settings:', settings);
                alert('Settings logged to console:\n' + (settings || 'No settings found'));
            } catch (error) {
                console.error('Error accessing settings:', error);
                alert('Error accessing settings: ' + error.message);
            }
        });
        footer.appendChild(debugButton);
    }
}

function saveSettingsHandler(e) {
    e.preventDefault();
    saveSettings();
}

function resetSettingsHandler(e) {
    e.preventDefault();
    resetSettings();
}

function saveSettings() {
    // Collect settings from form
    const settings = {
        theme: document.getElementById('theme-select')?.value || 'light',
        fontSize: document.getElementById('font-size')?.value || 'medium',
        enableNotifications: document.getElementById('enable-notifications')?.checked || false,
        notificationSound: document.getElementById('notification-sound')?.checked || false,
        sendKey: document.getElementById('send-key')?.value || 'enter',
        readReceipts: document.getElementById('read-receipts')?.checked || false,
        quickDelete: document.getElementById('quick-delete')?.checked || false
    };
    
    // Save to localStorage as backup
    try {
        safeLocalStorage().setItem('chatSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
    
    // Save to server if possible
    const saveButton = document.getElementById('save-settings');
    
    if (window.pywebview?.api) {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            saveButton.style.opacity = '0.7';
        }
        
        window.pywebview.api.save_settings(settings)
            .then(response => {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Settings';
                    saveButton.style.opacity = '1';
                }
                
                if (response?.ok) {
                    // Show success notification
                    const successNotice = document.createElement('div');
                    successNotice.textContent = 'Settings saved successfully!';
                    successNotice.style.cssText = 'background-color: #4CAF50; color: white; padding: 10px; margin-top: 10px; border-radius: 5px; text-align: center;';
                    
                    const footer = document.querySelector('.settings-footer');
                    if (footer) {
                        footer.appendChild(successNotice);
                        setTimeout(() => successNotice.remove(), 3000);
                    }
                } else {
                    console.error('Failed to save settings:', response);
                    alert('Error: Failed to save settings to server');
                }
            })
            .catch(error => {
                console.error('Error saving settings:', error);
                alert('Error saving settings: ' + (error.message || 'Unknown error'));
                
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Settings';
                    saveButton.style.opacity = '1';
                }
            });
    } else {
        console.warn('PyWebView API not available - settings only saved locally');
    }
    
    // Apply settings immediately
    applySettings(settings);
    return false;
}

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
    applySettingsToForm(defaultSettings);
    
    // Save to localStorage
    try {
        safeLocalStorage().setItem('chatSettings', JSON.stringify(defaultSettings));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
    
    // Show notification
    import('./message.js').then(module => {
        module.Toast.show('Settings reset to default', 'info', 3000);
    });
    
    // Apply settings
    applySettings(defaultSettings);
}

function testBackendConnection() {
    if (window.pywebview?.api) {
        const testData = { test: true, timestamp: new Date().toISOString() };
        
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
        alert('PyWebview API not available for testing');
    }
}

function loadSavedSettings() {
    // First try API, then fallback to localStorage
    if (window.pywebview?.api) {
        window.pywebview.api.load_settings()
            .then(settings => {
                if (settings && typeof settings === 'object') {
                    console.log('Settings loaded from server');
                    applySettingsToForm(settings);
                    applySettings(settings);
                    
                    try {
                        safeLocalStorage().setItem('chatSettings', JSON.stringify(settings));
                    } catch (error) {
                        console.error('Error saving to localStorage:', error);
                    }
                } else {
                    fallbackToLocalStorage();
                }
            })
            .catch(() => fallbackToLocalStorage());
    } else {
        fallbackToLocalStorage();
    }
}

function fallbackToLocalStorage() {
    try {
        const savedSettings = safeLocalStorage().getItem('chatSettings');
        
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (typeof settings === 'object' && settings !== null) {
                applySettingsToForm(settings);
                applySettings(settings);
                return;
            }
        }
    } catch (e) {
        console.error('Error accessing localStorage settings:', e);
    }
    
    // Use defaults if no valid settings found
    const defaultSettings = {
        theme: 'light',
        fontSize: 'medium',
        enableNotifications: true,
        notificationSound: true,
        sendKey: 'enter',
        readReceipts: true,
        quickDelete: false
    };
    
    applySettingsToForm(defaultSettings);
    applySettings(defaultSettings);
    
    try {
        safeLocalStorage().setItem('chatSettings', JSON.stringify(defaultSettings));
        
        if (window.pywebview?.api) {
            window.pywebview.api.save_settings(defaultSettings)
                .catch(err => console.error('Error saving defaults to server:', err));
        }
    } catch (error) {
        console.error('Error saving defaults:', error);
    }
}

function applySettingsToForm(settings) {
    const elements = {
        'theme-select': { prop: 'value', default: 'light', key: 'theme' },
        'font-size': { prop: 'value', default: 'medium', key: 'fontSize' },
        'enable-notifications': { prop: 'checked', default: true, key: 'enableNotifications' },
        'notification-sound': { prop: 'checked', default: true, key: 'notificationSound' },
        'send-key': { prop: 'value', default: 'enter', key: 'sendKey' },
        'read-receipts': { prop: 'checked', default: true, key: 'readReceipts' },
        'quick-delete': { prop: 'checked', default: false, key: 'quickDelete' }
    };
    
    Object.entries(elements).forEach(([id, config]) => {
        const element = document.getElementById(id);
        if (element) {
            const value = settings[config.key] !== undefined ? settings[config.key] : config.default;
            element[config.prop] = value;
        }
    });
}

function applySettings(settings) {
    // Font size
    const fontSizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = fontSizes[settings.fontSize] || '16px';
    
    // Theme
    document.body.classList.toggle('dark-theme', settings.theme === 'dark');
}

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
