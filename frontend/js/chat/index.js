import { 
    messageInput, 
    searchButton, 
    searchInput, 
    searchContainer,
    clearSearch,
    toggleAllButton,
    setCurrentChatID,
    currentChatID
} from './constants.js';
import { updateUnreadCounts, setupAnimationStyles, showLoading, hideLoading } from './ui.js';
import { loadMessages, sendMessage } from './MessageManager.js';
import { initializeCategories } from './categories.js';

// Track if Shift key is pressed
let isShiftPressed = false;

// Register keyboard event listeners
document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = false;
    }
});

// Send message when Enter is pressed
messageInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {  // Allow Shift+Enter for new lines
        event.preventDefault(); // Prevent default Enter key behavior
        const messageText = messageInput.value.trim();
        if (messageText && currentChatID) {
            const success = await sendMessage(currentChatID, messageText, await window.pywebview.api.get_user_id());
            if (success) {
                messageInput.value = ''; // Clear the input after sending
            }
        }
    }
});

// Add event listener to toggle all categories
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

// Add event listener to show search input
searchButton.addEventListener('click', () => {
    searchButton.style.display = 'none';
    toggleAllButton.style.display = 'none'; // Hide the toggle-all button
    searchContainer.style.display = 'flex';
    searchInput.focus();
});

// Add event listener to clear and exit search input
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchContainer.style.display = 'none';
    searchButton.style.display = 'block';
    toggleAllButton.style.display = 'block'; // Show the toggle-all button again
    
    // Reset all chat items visibility
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(chat => {
        chat.style.display = 'flex';
    });
    
    // Reset all categories visibility
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        category.style.display = 'block';
    });
});

// Search functionality
searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const categories = document.querySelectorAll('.category');

    categories.forEach(category => {
        const header = category.querySelector('.category-header');
        const content = category.querySelector('.category-content');
        let hasVisibleChats = false;

        // Search through chat items in this category
        const chats = content.querySelectorAll('.chat-item');
        chats.forEach(chat => {
            const chatTitle = chat.textContent.toLowerCase();
            if (chatTitle.includes(searchTerm)) {
                chat.style.display = 'flex';
                hasVisibleChats = true;
            } else {
                chat.style.display = 'none';
            }
        });

        // Show/hide category based on whether it has matching chats
        if (hasVisibleChats || searchTerm === '') {
            category.style.display = 'block';
            if (searchTerm !== '') {
                content.classList.remove('collapsed');
                header.classList.remove('collapsed');
            }
        } else {
            category.style.display = 'none';
        }
    });
});

// Event listener for dropdown menu option clicks
document.addEventListener('click', (event) => {
    if (event.target.tagName === 'LI' && event.target.closest('.dropdown-menu')) {
        const optionText = event.target.textContent;
        const chatItem = event.target.closest('.chat-item');
        
        if (chatItem && optionText === 'Mark as Read') {
            const chatID = chatItem.getAttribute('data-chat-id');
            const chatTitle = chatItem.querySelector('.chat-title').textContent;
            
            if (chatID) {
                // First find if this chat exists in the Unread category
                const unreadCategory = Array.from(document.querySelectorAll('.category')).find(
                    cat => cat.querySelector('.category-header').textContent === 'Unread'
                );
                
                window.pywebview.api.markBubbleAsRead(chatID)
                    .then(() => {
                        // Update unread count to zero in all instances of this chat
                        document.querySelectorAll(`.chat-item[data-chat-id="${chatID}"] .unread-count`).forEach(countElement => {
                            countElement.textContent = '0';
                        });
                        
                        // Update visibility of unread counts
                        updateUnreadCounts();
                        
                        // If the chat is in the Unread category, animate and remove it
                        if (unreadCategory) {
                            const unreadChatItem = Array.from(unreadCategory.querySelectorAll('.chat-item')).find(
                                item => item.getAttribute('data-chat-id') === chatID
                            );
                            
                            if (unreadChatItem) {
                                // Add the fade-out class for animation
                                unreadChatItem.classList.add('fade-out');
                                
                                // Remove the item after animation completes
                                setTimeout(() => {
                                    unreadChatItem.remove();
                                    
                                    // Check if the category is now empty
                                    const remainingItems = unreadCategory.querySelectorAll('.category-content .chat-item');
                                    if (remainingItems.length === 0) {
                                        unreadCategory.classList.add('empty');
                                        
                                        // Animate the category removal with a delay
                                        setTimeout(() => {
                                            unreadCategory.classList.add('fade-out');
                                            setTimeout(() => {
                                                unreadCategory.remove();
                                            }, 500);
                                        }, 200);
                                    }
                                }, 500); // Match this duration with CSS transition time
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error marking bubble as read:', error);
                    });
            }
        }
    }
});

// Close dropdowns when clicking outside
window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
});

// Event delegation for dropdown menu buttons
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('menu-button')) {
        event.stopPropagation();
        const dropdown = event.target.nextElementSibling;
        dropdown.classList.toggle('show');
    }
});

// Event delegation for category headers
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('category-header')) {
        const content = event.target.nextElementSibling;
        const isExpanded = content.classList.contains('expanded');

        // Toggle the 'expanded' and 'collapsed' classes
        content.classList.toggle('expanded');
        content.classList.toggle('collapsed');

        // Toggle the arrow direction
        event.target.classList.toggle('collapsed', isExpanded);
    }
});

// Function to wait for pywebview API to be ready
function waitForPywebview() {
    if (window.pywebview && window.pywebview.api) {
        initializeBubbles();
    } else {
        setTimeout(waitForPywebview, 100); // Check again after 100ms
    }
}

// Function to initialize live bubbles and then categories
async function initializeBubbles() {
    try {
        console.log("Fetching live bubbles");
        await window.pywebview.api.get_live_bubbles();
        initializeCategories();
    } catch (error) {
        console.error("Error fetching live bubbles:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html';
        }
    }
}

// Initialize app when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('chat.html DOMContentLoaded');
    setupAnimationStyles();
    showLoading();
    waitForPywebview();
});

// Expose currentChatID to window for access from other modules
window.currentChatID = currentChatID;
