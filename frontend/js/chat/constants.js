// DOM element references
export const messagesContainer = document.getElementById('messages');
export const messageInput = document.getElementById('message-input');
export const searchButton = document.getElementById('search-button');
export const searchInput = document.getElementById('search-input');
export const searchContainer = document.querySelector('.search-container');
export const clearSearch = document.getElementById('clear-search');
export const toggleAllButton = document.getElementById('toggle-all');
export const chatHeading = document.getElementById('chat-heading');

// Global state variables
export let lastSender = null; // Track the last message sender
export const hasDeletePermission = true; // Message Delete permission
export let isShiftPressed = false; // Track if Shift key is pressed
export let currentChatID = null; // Track the current chat ID

// Update current chat ID
export function setCurrentChatID(id) {
    currentChatID = id;
}
