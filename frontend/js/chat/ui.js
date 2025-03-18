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
