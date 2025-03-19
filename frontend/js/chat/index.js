import { 
    messageInput, searchButton, searchInput, searchContainer, clearSearch,
    toggleAllButton, setCurrentChatID, currentChatID
} from './constants.js';
import { updateUnreadCounts, setupAnimationStyles, showLoading, hideLoading } from './ui.js';
import { loadMessages, sendMessage } from './MessageManager.js';
import { initializeCategories } from './categories.js';

// Keyboard handling
let isShiftPressed = false;
document.addEventListener('keydown', (e) => isShiftPressed = e.key === 'Shift' || isShiftPressed);
document.addEventListener('keyup', (e) => isShiftPressed = e.key === 'Shift' ? false : isShiftPressed);

// Send message on Enter (unless Shift is pressed for new line)
messageInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && currentChatID) {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (messageText && await sendMessage(currentChatID, messageText, await window.pywebview.api.get_user_id())) {
            messageInput.value = '';
        }
    }
});

// Category UI controls
toggleAllButton.addEventListener('click', () => {
    const isCollapsing = toggleAllButton.textContent === 'Collapse All';
    document.querySelectorAll('.category-content').forEach(content => {
        content.classList.toggle('expanded', !isCollapsing);
        content.classList.toggle('collapsed', isCollapsing);
    });
    document.querySelectorAll('.category-header').forEach(header => {
        header.classList.toggle('collapsed', isCollapsing);
    });
    toggleAllButton.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
});

// Search functionality
searchButton.addEventListener('click', () => {
    searchButton.style.display = 'none';
    toggleAllButton.style.display = 'none';
    searchContainer.style.display = 'flex';
    searchInput.focus();
});

clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchContainer.style.display = 'none';
    searchButton.style.display = 'block';
    toggleAllButton.style.display = 'block';
    
    // Reset visibility
    document.querySelectorAll('.chat-item').forEach(chat => chat.style.display = 'flex');
    document.querySelectorAll('.category').forEach(category => category.style.display = 'block');
});

// Add event listener for Escape key on search input
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Mimic the behavior of clicking the X button
        searchInput.value = '';
        searchContainer.style.display = 'none';
        searchButton.style.display = 'block';
        toggleAllButton.style.display = 'block';
        
        // Reset visibility
        document.querySelectorAll('.chat-item').forEach(chat => chat.style.display = 'flex');
        document.querySelectorAll('.category').forEach(category => category.style.display = 'block');
    }
});

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    document.querySelectorAll('.category').forEach(category => {
        const header = category.querySelector('.category-header');
        const content = category.querySelector('.category-content');
        let hasVisibleChats = false;

        content.querySelectorAll('.chat-item').forEach(chat => {
            const isVisible = chat.textContent.toLowerCase().includes(searchTerm);
            chat.style.display = isVisible ? 'flex' : 'none';
            hasVisibleChats = hasVisibleChats || isVisible;
        });

        category.style.display = (hasVisibleChats || searchTerm === '') ? 'block' : 'none';
        if (searchTerm !== '' && hasVisibleChats) {
            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
        }
    });
});

// Mark as read functionality
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI' && e.target.closest('.dropdown-menu') && e.target.textContent === 'Mark as Read') {
        const chatItem = e.target.closest('.chat-item');
        if (!chatItem) return;
        
        const chatID = chatItem.getAttribute('data-chat-id');
        const unreadCategory = Array.from(document.querySelectorAll('.category'))
            .find(cat => cat.querySelector('.category-header').textContent === 'Unread');
        
        window.pywebview.api.markBubbleAsRead(chatID)
            .then(() => {
                document.querySelectorAll(`.chat-item[data-chat-id="${chatID}"] .unread-count`)
                    .forEach(el => el.textContent = '0');
                
                updateUnreadCounts();
                
                if (unreadCategory) {
                    const unreadChatItem = Array.from(unreadCategory.querySelectorAll('.chat-item'))
                        .find(item => item.getAttribute('data-chat-id') === chatID);
                    
                    if (unreadChatItem) {
                        unreadChatItem.classList.add('fade-out');
                        setTimeout(() => {
                            unreadChatItem.remove();
                            
                            if (unreadCategory.querySelectorAll('.category-content .chat-item').length === 0) {
                                unreadCategory.classList.add('empty', 'fade-out');
                                setTimeout(() => unreadCategory.remove(), 500);
                            }
                        }, 500);
                    }
                }
            })
            .catch(error => console.error('Error marking bubble as read:', error));
    }
});

// UI interaction handlers
document.addEventListener('click', (e) => {
    // Close all dropdowns when clicking anywhere
    if (!e.target.classList.contains('menu-button')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }
    
    // Toggle dropdown menu
    if (e.target.classList.contains('menu-button')) {
        e.stopPropagation();
        e.target.nextElementSibling.classList.toggle('show');
    }
    
    // Toggle category expansion
    if (e.target.classList.contains('category-header')) {
        const content = e.target.nextElementSibling;
        const isExpanded = content.classList.contains('expanded');
        content.classList.toggle('expanded');
        content.classList.toggle('collapsed');
        e.target.classList.toggle('collapsed', isExpanded);
    }
});

// Settings functions
function safeLocalStorage() {
    try {
        localStorage.setItem('__test__', '__test__');
        localStorage.removeItem('__test__');
        return localStorage;
    } catch (e) {
        console.warn('localStorage unavailable, using memory storage');
        const memoryStorage = {};
        return {
            getItem: key => memoryStorage[key] || null,
            setItem: (key, value) => { memoryStorage[key] = value; },
            removeItem: key => { delete memoryStorage[key]; }
        };
    }
}

function getDefaultSettings() {
    return {
        theme: 'light',
        fontSize: 'medium',
        enableNotifications: true,
        notificationSound: true,
        sendKey: 'enter',
        readReceipts: true,
        quickDelete: false
    };
}

function applySettings(settings) {
    const fontSizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = fontSizes[settings.fontSize] || '16px';
    document.body.classList.toggle('dark-theme', settings.theme === 'dark');
}

function loadSettings() {
    return window.pywebview.api.load_settings()
        .then(settings => {
            if (settings) {
                try {
                    safeLocalStorage().setItem('chatSettings', JSON.stringify(settings));
                } catch (error) {
                    console.error('Error saving settings:', error);
                }
                applySettings(settings);
                return settings;
            }
            return loadLocalSettings();
        })
        .catch(() => loadLocalSettings());
}

function loadLocalSettings() {
    try {
        const savedSettings = safeLocalStorage().getItem('chatSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                applySettings(settings);
                return settings;
            } catch (e) {
                console.error('Error parsing settings:', e);
            }
        }
    } catch (error) {
        console.error('Error accessing storage:', error);
    }
    
    const defaultSettings = getDefaultSettings();
    applySettings(defaultSettings);
    return defaultSettings;
}

// Initialization
async function initializeBubbles() {
    try {
        await window.pywebview.api.get_live_bubbles();
        loadSettings();
        initializeCategories();
    } catch (error) {
        console.error("Error fetching live bubbles:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html';
        }
    }
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    setupAnimationStyles();
    showLoading();
    
    // Wait for pywebview API
    (function waitForPywebview() {
        if (window.pywebview?.api) {
            initializeBubbles();
        } else {
            setTimeout(waitForPywebview, 100);
        }
    })();
    
    // Settings button handler
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            import('./ui.js').then(module => module.showSettings());
        });
    }
});

// Expose currentChatID globally
window.currentChatID = currentChatID;
