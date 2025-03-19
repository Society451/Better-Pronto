// This file handles settings functionality that's independent of the chat UI

// Load settings when document is ready (if this file is used independently)
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the standalone settings page
    if (document.body.classList.contains('settings-page')) {
        initializeSettings();
    }
});

function initializeSettings() {
    console.log('Initializing settings from settings.js');
    loadSavedSettings();
    
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
}

function saveSettings() {
    console.log('Saving settings from settings.js');
    const theme = document.getElementById('theme-select')?.value || 'light';
    const fontSize = document.getElementById('font-size')?.value || 'medium';
    const enableNotifications = document.getElementById('enable-notifications')?.checked || false;
    const notificationSound = document.getElementById('notification-sound')?.checked || false;
    const sendKey = document.getElementById('send-key')?.value || 'enter';
    const readReceipts = document.getElementById('read-receipts')?.checked || true;
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
    
    // Save to localStorage as backup
    localStorage.setItem('chatSettings', JSON.stringify(settings));
    
    // Save to backend API if available
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.save_settings(settings)
            .then(response => {
                if (response && response.ok) {
                    showMessage('Settings saved successfully');
                } else {
                    showMessage('Settings saved locally, but failed to save to server');
                }
            })
            .catch(error => {
                console.error('Error saving settings to server:', error);
                showMessage('Settings saved locally, but failed to save to server');
            });
    } else {
        // If API is not available, just show success message
        showMessage('Settings saved successfully');
    }
    
    // Apply settings
    applySettings(settings);
}

function showMessage(message) {
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
        quickDelete: false
    };
    
    // Update form values
    if (document.getElementById('theme-select')) document.getElementById('theme-select').value = defaultSettings.theme;
    if (document.getElementById('font-size')) document.getElementById('font-size').value = defaultSettings.fontSize;
    if (document.getElementById('enable-notifications')) document.getElementById('enable-notifications').checked = defaultSettings.enableNotifications;
    if (document.getElementById('notification-sound')) document.getElementById('notification-sound').checked = defaultSettings.notificationSound;
    if (document.getElementById('send-key')) document.getElementById('send-key').value = defaultSettings.sendKey;
    if (document.getElementById('read-receipts')) document.getElementById('read-receipts').checked = defaultSettings.readReceipts;
    if (document.getElementById('quick-delete')) document.getElementById('quick-delete').checked = defaultSettings.quickDelete;
    
    // Save to localStorage
    localStorage.setItem('chatSettings', JSON.stringify(defaultSettings));
    
    // Show success message
    alert('Settings reset to default');
    
    // Apply settings
    applySettings(defaultSettings);
}

function loadSavedSettings() {
    // Try to load from API first if available
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.load_settings()
            .then(settings => {
                if (settings) {
                    console.log('Settings loaded from server:', settings);
                    applySettingsToForm(settings);
                    applySettings(settings);
                    // Also save to localStorage as backup
                    localStorage.setItem('chatSettings', JSON.stringify(settings));
                } else {
                    // Fall back to localStorage
                    fallbackToLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error loading settings from server:', error);
                fallbackToLocalStorage();
            });
    } else {
        // If API is not available, use localStorage
        fallbackToLocalStorage();
    }
}

// Helper function to fall back to localStorage settings
function fallbackToLocalStorage() {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            console.log('Settings loaded from localStorage:', settings);
            applySettingsToForm(settings);
            applySettings(settings);
        } catch (e) {
            console.error('Error parsing localStorage settings:', e);
        }
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

// Export functions for usage in other modules
export { initializeSettings, saveSettings, resetSettings, loadSavedSettings, applySettings };
