// This file handles settings functionality that's independent of the chat UI

// Settings constants - these will be updated when settings are loaded
const SETTINGS = {
    // Interface settings
    theme: 'light', // Keep for user preference, but won't be applied
    fontSize: 'medium',
    
    // Notification settings
    enableNotifications: true,
    notificationSound: true,
    
    // Chat settings
    sendKey: 'enter',
    readReceipts: true,
    quickDelete: false,
    showLoadingAnimation: true
};

// Track which tab is active
let activeTab = 'interface';

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded in settings.js');
    
    // Check if we're on the standalone settings page
    if (document.body.classList.contains('settings-page')) {
        waitForPywebview();
    } else {
        // For embedded settings within the chat interface, initialize right away
        // but set a short delay to ensure DOM is fully rendered
        setTimeout(initializeSettings, 200);
    }
});

// Wait for pywebview API to be available before initializing
function waitForPywebview() {
    console.log('Waiting for pywebview API...');
    // Check if the API is available
    if (window.pywebview && window.pywebview.api) {
        console.log('Pywebview API ready, initializing settings');
        initializeSettings();
    } else {
        // Retry until the API becomes available
        setTimeout(waitForPywebview, 100);
    }
}

function initializeSettings() {
    console.log('Initializing settings from settings.js');
    
    // Always set up the UI first
    setupUI();
    
    // Then try to load settings which might take time
    loadSavedSettings();
}

function setupUI() {
    // Set up tab navigation first so UI is responsive
    setupTabNavigation();
    
    // Add event listeners to settings form elements
    const settingsForm = document.getElementById('settings-form');
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-settings');
    
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submit event caught');
            saveSettings();
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Save button clicked from settings.js');
            saveSettings();
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Reset button clicked from settings.js');
            resetSettings();
        });
    }
    
    // Add listeners to form elements to update SETTINGS object when changed
    addFormChangeListeners();
}

function addFormChangeListeners() {
    const formElements = {
        'theme-select': { type: 'select', key: 'theme' },
        'font-size': { type: 'select', key: 'fontSize' },
        'enable-notifications': { type: 'checkbox', key: 'enableNotifications' },
        'notification-sound': { type: 'checkbox', key: 'notificationSound' },
        'send-key': { type: 'select', key: 'sendKey' },
        'read-receipts': { type: 'checkbox', key: 'readReceipts' },
        'quick-delete': { type: 'checkbox', key: 'quickDelete' },
        'show-loading-animation': { type: 'checkbox', key: 'showLoadingAnimation' }
    };
    
    Object.entries(formElements).forEach(([id, config]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(config.type === 'checkbox' ? 'change' : 'input', () => {
                SETTINGS[config.key] = config.type === 'checkbox' ? element.checked : element.value;
                console.log(`Setting ${config.key} updated to ${SETTINGS[config.key]}`);
            });
        } else {
            console.warn(`Element ${id} not found for listening to changes`);
        }
    });
}

function setupTabNavigation() {
    console.log('Setting up tab navigation');
    
    // Get all tab buttons and content elements
    const tabButtons = document.querySelectorAll('.settings-tab-button');
    const tabContents = document.querySelectorAll('.settings-tab-content');
    
    if (tabButtons.length === 0) {
        console.warn('No tab buttons found');
        return;
    }
    
    console.log(`Found ${tabButtons.length} tab buttons`);
    
    // First, hide all tab contents
    tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add click event listeners to all tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log(`Tab clicked: ${tabId}`);
            
            // Update active tab
            activeTab = tabId;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            
            // Add active class to current button
            this.classList.add('active');
            
            // Show current tab content
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.style.display = 'block';
                tabContent.classList.add('active');
                
                // Log for debugging
                console.log(`Activated tab: ${tabId}, content:`, tabContent);
            } else {
                console.error(`Tab content not found for tab: ${tabId}`);
            }
        });
    });
    
    // Activate interface tab by default (guaranteed to exist)
    const defaultTab = document.querySelector('.settings-tab-button[data-tab="interface"]');
    if (defaultTab) {
        console.log('Activating default interface tab');
        defaultTab.click();
    } else {
        console.warn('Default interface tab not found, trying first tab');
        tabButtons[0]?.click();
    }
}

function saveSettings() {
    console.log('Saving settings from settings.js');
    
    // Update SETTINGS from all form elements to ensure everything is saved
    SETTINGS.theme = document.getElementById('theme-select')?.value || 'light';
    SETTINGS.fontSize = document.getElementById('font-size')?.value || 'medium';
    SETTINGS.enableNotifications = document.getElementById('enable-notifications')?.checked || false;
    SETTINGS.notificationSound = document.getElementById('notification-sound')?.checked || false;
    SETTINGS.sendKey = document.getElementById('send-key')?.value || 'enter';
    SETTINGS.readReceipts = document.getElementById('read-receipts')?.checked || false;
    SETTINGS.quickDelete = document.getElementById('quick-delete')?.checked || false;
    SETTINGS.showLoadingAnimation = document.getElementById('show-loading-animation')?.checked || true;
    
    // Also check encryption and macros settings even though they're disabled
    SETTINGS.encryptionEnabled = document.getElementById('encryption-enabled')?.checked || false;
    SETTINGS.macrosEnabled = document.getElementById('macros-enabled')?.checked || false;
    
    // Get log level if it exists
    if (document.getElementById('log-level')) {
        SETTINGS.logLevel = document.getElementById('log-level')?.value || 'error';
    }
    
    // Save to backend API
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
    }
    
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.save_settings(SETTINGS)
            .then(response => {
                if (response && response.ok) {
                    // Use Toast notification if available
                    tryUseToast('Settings saved successfully', 'success');
                } else {
                    showMessage('Failed to save settings to server');
                }
                
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Settings';
                }
            })
            .catch(error => {
                console.error('Error saving settings to server:', error);
                showMessage('Error saving settings: ' + (error.message || 'Unknown error'));
                
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Settings';
                }
            });
    } else {
        showMessage('Cannot save settings: API not available');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Settings';
        }
    }
}

// Helper function to try using Toast for notifications
function tryUseToast(message, type = 'info', duration = 3000) {
    try {
        import('./chat/message.js')
            .then(module => {
                if (module && module.Toast && typeof module.Toast.show === 'function') {
                    module.Toast.show(message, type, duration);
                } else {
                    showMessage(message);
                }
            })
            .catch(err => {
                console.warn('Could not import Toast module:', err);
                showMessage(message);
            });
    } catch (e) {
        showMessage(message);
    }
}

function showMessage(message) {
    // Fallback to alert
    if (typeof alert !== 'undefined') {
        alert(message);
    } else {
        console.log(message);
    }
}

function resetSettings() {
    const defaultSettings = {
        theme: 'light',
        fontSize: 'medium',
        enableNotifications: true,
        notificationSound: true,
        sendKey: 'enter',
        readReceipts: true,
        quickDelete: false,
        showLoadingAnimation: true
    };
    
    // Update our SETTINGS object with defaults
    Object.assign(SETTINGS, defaultSettings);
    
    // Update form values
    applySettingsToForm(defaultSettings);
    
    // Show success message
    tryUseToast('Settings reset to default', 'info');
    
    // Save default settings to server
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.save_settings(defaultSettings)
            .catch(error => {
                console.error('Error saving default settings to server:', error);
            });
    }
}

function loadSavedSettings() {
    console.log('Loading saved settings');
    
    // Apply default settings first so UI is not empty
    applySettingsToForm(SETTINGS);
    applyVisualSettings(SETTINGS);
    
    // Only load from API if available
    if (window.pywebview && window.pywebview.api) {
        console.log('PyWebView API available, loading settings from server');
        
        try {
            window.pywebview.api.load_settings()
                .then(settings => {
                    if (settings) {
                        console.log('Settings loaded from server:', settings);
                        
                        // Update our SETTINGS object
                        Object.assign(SETTINGS, settings);
                        
                        // Apply to form
                        applySettingsToForm(settings);
                        
                        // Apply visual changes
                        applyVisualSettings(settings);
                    } else {
                        console.log('No settings found on server, using defaults');
                    }
                })
                .catch(error => {
                    console.error('Error loading settings from server:', error);
                });
        } catch (e) {
            console.error('Exception when loading settings:', e);
        }
    } else {
        console.warn('PyWebView API not available, cannot load settings from server');
    }
}

// Helper function to apply settings to form elements
function applySettingsToForm(settings) {
    const elements = {
        'theme-select': { prop: 'value', default: 'light', key: 'theme' },
        'font-size': { prop: 'value', default: 'medium', key: 'fontSize' },
        'enable-notifications': { prop: 'checked', default: true, key: 'enableNotifications' },
        'notification-sound': { prop: 'checked', default: true, key: 'notificationSound' },
        'send-key': { prop: 'value', default: 'enter', key: 'sendKey' },
        'read-receipts': { prop: 'checked', default: true, key: 'readReceipts' },
        'quick-delete': { prop: 'checked', default: false, key: 'quickDelete' },
        'show-loading-animation': { prop: 'checked', default: true, key: 'showLoadingAnimation' }
    };

    Object.entries(elements).forEach(([id, config]) => {
        const element = document.getElementById(id);
        if (element) {
            const value = settings[config.key] !== undefined ? settings[config.key] : config.default;
            element[config.prop] = value;
        }
    });
}

// Apply settings visually (no saving)
function applyVisualSettings(settings) {
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
    
    // We don't apply theme changes at all anymore
    // Removed all theme-related application code
}

// Get current settings
function getSettings() {
    return { ...SETTINGS };
}

// Export functions for usage in other modules
export { initializeSettings, saveSettings, resetSettings, loadSavedSettings, applyVisualSettings, getSettings, SETTINGS };
