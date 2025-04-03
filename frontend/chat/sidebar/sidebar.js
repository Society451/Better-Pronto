// Data structures for chats
let directMessages = [];
let categorizedBubbles = {};
let uncategorizedBubbles = [];
let unreadBubbles = [];
let categories = [];

// Track API availability and chat data loading
let isApiAvailable = false;
let isDataLoaded = false;
let isLiveDataLoading = false; // Track if we're loading live data
let currentSearchTerm = '';
let isSearchVisible = false; // Track search visibility
let collapsedCategories = {}; // Keep track of collapsed state
let currentSelectedBubbleId = null;
let allCategoriesCollapsed = false; // State for collapse all button

// Ensure the API object is initialized properly
let api = {
    get_Localdms: async () => {
        const response = await fetch('/api/get_Localdms');
        return response.ok ? response.json() : [];
    },
    get_Localcategorized_bubbles: async () => {
        const response = await fetch('/api/get_Localcategorized_bubbles');
        return response.ok ? response.json() : {};
    },
    get_Localuncategorized_bubbles: async () => {
        const response = await fetch('/api/get_Localuncategorized_bubbles');
        return response.ok ? response.json() : [];
    },
    get_Localunread_bubbles: async () => {
        const response = await fetch('/api/get_Localunread_bubbles');
        return response.ok ? response.json() : [];
    },
    get_Localcategories: async () => {
        const response = await fetch('/api/get_Localcategories');
        return response.ok ? response.json() : [];
    }
};

// Update API availability check to use Flask endpoints
function checkApiAvailability() {
    fetch('/api/methods')
        .then(response => {
            if (response.ok) {
                console.log('Flask API is available');
                isApiAvailable = true;
                loadInitialChatData();
            } else {
                console.log('Flask API not available yet, retrying in 500ms');
                setTimeout(checkApiAvailability, 500);
            }
        })
        .catch(error => {
            console.error('Error checking Flask API availability:', error);
            setTimeout(checkApiAvailability, 500);
        });
}

// Update loadInitialChatData to use the initialized API object
async function loadInitialChatData() {
    try {
        console.log('Loading initial chat data from local storage...');
        
        // Load local data first (in parallel)
        const [dms, categorizedChats, uncategorizedChats, unreadChats, categoryList] = await Promise.all([
            api.get_Localdms(),
            api.get_Localcategorized_bubbles(),
            api.get_Localuncategorized_bubbles(),
            api.get_Localunread_bubbles(),
            api.get_Localcategories()
        ]);
        
        // Store the data
        directMessages = dms || [];
        categorizedBubbles = categorizedChats || {};
        uncategorizedBubbles = uncategorizedChats || [];
        unreadBubbles = unreadChats || [];
        categories = categoryList || [];
        
        console.log('Initial chat data loaded from local storage:', {
            dms: directMessages.length,
            categories: categories.length,
            uncategorized: uncategorizedBubbles.length,
            unread: unreadBubbles.length
        });
        
        isDataLoaded = true;
        renderSidebar();
        
        // Then, fetch live data in the background
        fetchLiveBubbleData();
    } catch (error) {
        console.error('Error loading initial chat data:', error);
        // Retry after a short delay
        setTimeout(loadInitialChatData, 2000);
    }
}

// Fetch live bubble data from the server
async function fetchLiveBubbleData() {
    if (isLiveDataLoading) return;
    
    try {
        isLiveDataLoading = true;
        console.log('Fetching live bubble data...');
        
        // Call the API to get live bubbles data
        const liveBubblesResponse = await fetch('/api/get_live_bubbles');
        if (!liveBubblesResponse.ok) {
            throw new Error(`Failed to fetch live bubbles: ${liveBubblesResponse.status}`);
        }
        console.log('Live bubble data fetched and saved');
        
        // Reload data from local storage (which should now contain updated data)
        const [dmsResponse, categorizedChatsResponse, uncategorizedChatsResponse, unreadChatsResponse, categoryListResponse] = await Promise.all([
            fetch('/api/get_Localdms'),
            fetch('/api/get_Localcategorized_bubbles'),
            fetch('/api/get_Localuncategorized_bubbles'),
            fetch('/api/get_Localunread_bubbles'),
            fetch('/api/get_Localcategories')
        ]);
        
        // Parse all the JSON responses
        const dms = await dmsResponse.json();
        const categorizedChats = await categorizedChatsResponse.json();
        const uncategorizedChats = await uncategorizedChatsResponse.json();
        const unreadChats = await unreadChatsResponse.json();
        const categoryList = await categoryListResponse.json();
        
        // Update the data with fresh information
        directMessages = dms || [];
        categorizedBubbles = categorizedChats || {};
        uncategorizedBubbles = uncategorizedChats || [];
        unreadBubbles = unreadChats || [];
        categories = categoryList || [];
        
        console.log('Updated chat data loaded:', {
            dms: directMessages.length,
            categories: categories.length,
            uncategorized: uncategorizedBubbles.length,
            unread: unreadBubbles.length
        });
        
        isDataLoaded = true;
        renderSidebar(currentSearchTerm);
        
        // If there's a currently selected bubble, refresh its messages
        if (currentSelectedBubbleId) {
            triggerMessagesRefresh(currentSelectedBubbleId);
        }
    } catch (error) {
        console.error('Error fetching live bubble data:', error);
    } finally {
        isLiveDataLoading = false;
        
        // Schedule periodic refresh
        setTimeout(fetchLiveBubbleData, 60000); // Refresh every minute
    }
}

// Render the entire sidebar with all chat categories
function renderSidebar(searchTerm = '') {
    const chatList = document.getElementById('chat-list');
    if (!chatList || !isDataLoaded) {
        console.error(isDataLoaded ? 'Chat list element not found' : 'Chat data not loaded yet');
        return;
    }
    
    // Store the current search term
    currentSearchTerm = searchTerm.toLowerCase().trim();
    
    // Clear existing items
    chatList.innerHTML = '';
    
    // If still loading data initially, show loading indicator
    if (!isDataLoaded) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Loading chats...</span>
        `;
        chatList.appendChild(loadingIndicator);
        return;
    }
    
    // Render unread messages section if there are any
    const filteredUnreadBubbles = filterChatsBySearch(unreadBubbles, currentSearchTerm);
    if (filteredUnreadBubbles.length > 0) {
        // Process unread bubbles to ensure they have valid IDs
        const processedUnreadBubbles = processUnreadBubbles(filteredUnreadBubbles);
        
        // Make sure the unread category is ALWAYS initialized in the collapsedCategories object
        // and only collapse it if explicitly set or all categories are collapsed
        if (collapsedCategories['unread'] === undefined) {
            collapsedCategories['unread'] = false; // Default to expanded
        }
        
        // Only force expand if not in all-collapsed mode
        if (allCategoriesCollapsed) {
            collapsedCategories['unread'] = true;
        }
        
        console.log('Rendering unread category:', { 
            bubbles: processedUnreadBubbles.length, 
            collapsed: collapsedCategories['unread'] 
        });
        renderChatCategory('Unread', processedUnreadBubbles, 'unread', chatList);
    }
    
    // Render direct messages
    const filteredDMs = filterChatsBySearch(directMessages, currentSearchTerm);
    renderChatCategory('Direct Messages', filteredDMs, 'dm', chatList);
    
    // Render categorized bubbles - one category at a time
    for (const category of categories) {
        if (categorizedBubbles[category]) {
            const filteredBubbles = filterChatsBySearch(categorizedBubbles[category], currentSearchTerm);
            if (filteredBubbles.length > 0) {
                renderChatCategory(
                    category, 
                    filteredBubbles, 
                    `category-${category.replace(/\s+/g, '-').toLowerCase()}`, 
                    chatList
                );
            }
        }
    }
    
    // Render uncategorized bubbles
    const filteredUncategorizedBubbles = filterChatsBySearch(uncategorizedBubbles, currentSearchTerm);
    if (filteredUncategorizedBubbles.length > 0) {
        renderChatCategory('Uncategorized', filteredUncategorizedBubbles, 'uncategorized', chatList);
    }
    
    // If live data is being loaded, show a subtle indicator
    if (isLiveDataLoading) {
        const updatingIndicator = document.createElement('div');
        updatingIndicator.className = 'updating-indicator';
        updatingIndicator.textContent = 'Updating...';
        chatList.appendChild(updatingIndicator);
    }
    
    // If no results found after filtering, show a message
    if (currentSearchTerm && chatList.childElementCount === (isLiveDataLoading ? 1 : 0)) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No chats found matching your search';
        chatList.appendChild(noResults);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Update the collapse all button state
    updateCollapseAllButtonState();
}

// Filter chats based on search term
function filterChatsBySearch(chats, searchTerm) {
    if (!searchTerm) return chats;
    return chats.filter(chat => {
        return chat.title && chat.title.toLowerCase().includes(searchTerm);
    });
}

// Special function to handle unread bubbles which have a different structure
function processUnreadBubbles(unreadBubbles) {
    // Process the unread bubbles to include a proper id field
    return unreadBubbles.map(bubble => {
        // Check if bubble already has an id, if not try to find one
        if (!bubble.id && bubble.bubble_id) {
            // If bubble has bubble_id property, use that as id
            bubble.id = bubble.bubble_id;
        } else if (!bubble.id) {
            // Try to find this bubble's ID by matching title in other collections
            const matchInDMs = directMessages.find(dm => dm.title === bubble.title);
            if (matchInDMs) {
                bubble.id = matchInDMs.id;
            } else {
                // Look through categorized bubbles
                for (const category in categorizedBubbles) {
                    const match = categorizedBubbles[category].find(
                        chat => chat.title === bubble.title
                    );
                    if (match) {
                        bubble.id = match.id;
                        break;
                    }
                }
                
                // Look through uncategorized bubbles if still not found
                if (!bubble.id) {
                    const match = uncategorizedBubbles.find(
                        chat => chat.title === bubble.title
                    );
                    if (match) {
                        bubble.id = match.id;
                    }
                }
            }
        }
        
        // If we still couldn't find an ID, create a temporary one based on title
        if (!bubble.id) {
            console.log(`Creating temporary ID for unread bubble: ${bubble.title}`);
            bubble.id = `unread-${btoa(bubble.title)}`;
        }
        
        return bubble;
    });
}

// Render a category of chats with collapsible header
function renderChatCategory(categoryName, chats, categoryId, container) {
    if (!chats || chats.length === 0) return;
    
    // Create category container
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'chat-category';
    categoryContainer.dataset.categoryId = categoryId;
    
    // Create category header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    
    // Create toggle icon
    const toggleIcon = document.createElement('i');
    toggleIcon.className = collapsedCategories[categoryId] 
        ? 'fas fa-chevron-right' 
        : 'fas fa-chevron-down';
    
    // Create category title
    const categoryTitle = document.createElement('span');
    categoryTitle.className = 'category-title';
    categoryTitle.textContent = `${categoryName} (${chats.length})`;
    
    // Assemble category header
    categoryHeader.appendChild(toggleIcon);
    categoryHeader.appendChild(categoryTitle);
    
    // Add click event to toggle collapse with improved handling
    categoryHeader.addEventListener('click', (event) => {
        // Stop event propagation to prevent other handlers from interfering
        event.stopPropagation();
        
        const chatItems = categoryContainer.querySelector('.category-items');
        if (!chatItems) return;
        
        // Toggle the collapsed state
        const isCollapsed = !chatItems.classList.contains('collapsed');
        
        // Update the DOM
        if (isCollapsed) {
            chatItems.classList.add('collapsed');
            toggleIcon.className = 'fas fa-chevron-right';
        } else {
            chatItems.classList.remove('collapsed');
            toggleIcon.className = 'fas fa-chevron-down';
        }
        
        // Store the state
        collapsedCategories[categoryId] = isCollapsed;
        
        console.log(`Category ${categoryName} (${categoryId}) toggled:`, isCollapsed ? 'collapsed' : 'expanded');
        
        // Update collapse all button state after toggling
        updateCollapseAllButtonState();
    });
    
    categoryContainer.appendChild(categoryHeader);
    
    // Create container for chat items
    const chatItemsContainer = document.createElement('div');
    chatItemsContainer.className = 'category-items';
    
    // Apply collapsed state if needed
    if (collapsedCategories[categoryId]) {
        chatItemsContainer.classList.add('collapsed');
    }
    
    // Create chat items one by one to avoid rendering issues
    chats.forEach((chat, index) => {
        if (!chat.id || !chat.title) {
            console.warn(`Skipping invalid chat item:`, chat);
            return;
        }
        
        const chatItem = createChatItem(chat);
        chatItemsContainer.appendChild(chatItem);
        
        // Add a small delay between rendering each item to avoid browser bottlenecks
        if (index % 10 === 0 && index > 0 && chats.length > 20) {
            setTimeout(() => {}, 0);
        }
    });
    
    categoryContainer.appendChild(chatItemsContainer);
    container.appendChild(categoryContainer);
}

// Helper function to create an element displaying user initials
function createInitialsElement(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        fullName = 'Unknown';
    }
    
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'profile-initials';
    
    // Extract initials from name (up to two characters)
    const initials = fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    
    initialsDiv.textContent = initials;
    
    // Generate a consistent color based on the name
    const hue = stringToHue(fullName);
    initialsDiv.style.backgroundColor = `hsl(${hue}, 60%, 80%)`;
    initialsDiv.style.color = `hsl(${hue}, 80%, 30%)`;
    
    return initialsDiv;
}

// Helper function to generate a consistent hue from a string
function stringToHue(str) {
    let hash = 0;
    for (let i = 0; str && i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
}

// Create a chat item element
function createChatItem(chat) {
    if (!chat || !chat.title) {
        console.error('Invalid chat object:', chat);
        return document.createElement('div'); // Return empty div to avoid errors
    }
    
    // For unread items, we may need to handle them specially since they have a different structure
    const isUnreadItem = chat.unread !== undefined;
    
    // Special handling for ID in unread items
    if (!chat.id && isUnreadItem) {
        console.log(`Using title as ID for unread chat: ${chat.title}`);
        chat.id = `unread-${btoa(chat.title)}`;
    }
    
    if (!chat.id) {
        console.warn(`Chat missing ID:`, chat);
        return document.createElement('div');
    }
    
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.id = chat.id;
    
    // Create profile picture with status indicator
    const profilePic = document.createElement('div');
    profilePic.className = 'profile-picture';
    
    // If chat has a profile picture URL, use it
    if (chat.profilepicurl) {
        const img = document.createElement('img');
        img.src = chat.profilepicurl;
        img.alt = chat.title;
        img.className = 'profile-img';
        
        // Handle image loading errors by showing initials instead
        img.onerror = () => {
            img.style.display = 'none';
            profilePic.appendChild(createInitialsElement(chat.title));
        };
        
        profilePic.appendChild(img);
    } else {
        // No profile picture, show initials
        profilePic.appendChild(createInitialsElement(chat.title));
    }
    
    // Create and add status indicator (default to offline)
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator status-offline';
    profilePic.appendChild(statusIndicator);
    
    // Create chat content
    const chatContent = document.createElement('div');
    chatContent.className = 'chat-content';
    
    const chatName = document.createElement('div');
    chatName.className = 'chat-name';
    
    // If there's a search term, highlight the matching text
    if (currentSearchTerm) {
        chatName.innerHTML = highlightText(chat.title, currentSearchTerm);
    } else {
        chatName.textContent = chat.title;
    }
    
    chatContent.appendChild(chatName);
    
    // Normal preview handling for regular chat items
    if (!isUnreadItem && chat.preview) {
        const chatPreview = document.createElement('div');
        chatPreview.className = 'chat-preview';
        chatPreview.textContent = chat.preview;
        chatContent.appendChild(chatPreview);
    }
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    
    const dropdownTrigger = document.createElement('button');
    dropdownTrigger.className = 'dropdown-trigger';
    dropdownTrigger.title = 'More options';
    dropdownTrigger.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    
    // Dropdown options
    const dropdownOptions = [
        { text: 'Mark as Read', action: 'markAsRead' },
        { text: 'Mute', action: 'toggleMute' },
        { text: 'Hide', action: 'hide' }
    ];
    
    dropdownOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = 'dropdown-item';
        button.textContent = option.text;
        button.dataset.action = option.action;
        button.dataset.chatId = chat.id;
        dropdownMenu.appendChild(button);
    });
    
    dropdown.appendChild(dropdownTrigger);
    dropdown.appendChild(dropdownMenu);
    
    // Append all elements to chat item
    chatItem.appendChild(profilePic);
    chatItem.appendChild(chatContent);
    chatItem.appendChild(dropdown);
    
    // Add unread badge if this is an unread item
    if (isUnreadItem) {
        const unreadBadge = document.createElement('div');
        
        // Determine badge style and content
        if (chat.unread_mentions > 0) {
            // Show only mention count in red if we have mentions
            unreadBadge.className = 'unread-badge mentions';
            unreadBadge.textContent = chat.unread_mentions;
        } else {
            // Show total unread count in grey, with "99+" for large numbers
            unreadBadge.className = 'unread-badge';
            unreadBadge.textContent = chat.unread >= 100 ? '99+' : chat.unread;
        }
        
        chatItem.appendChild(unreadBadge);
    }
    
    return chatItem;
}

// Function to highlight search terms in text
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text || '';
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Helper function to escape special characters in search term for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Set up event listeners for dropdowns and chat items
function setupEventListeners() {
    // Toggle dropdown menu visibility via three dots
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            e.preventDefault();
            
            // Get the associated dropdown menu
            const menu = this.nextElementSibling;
            if (menu) {
                showDropdownMenu(menu, e, false);
            }
        });
    });
    
    // Handle dropdown item clicks with better event handling
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default behavior
            e.stopPropagation(); // Prevent event bubbling
            
            const action = this.dataset.action;
            const chatId = this.dataset.chatId;
            
            // Handle the action
            handleDropdownAction(action, chatId);
            
            // Close dropdown
            const menu = this.closest('.dropdown-menu');
            if (menu) {
                if (menu.classList.contains('context-menu')) {
                    menu.remove();
                } else {
                    menu.classList.remove('active');
                }
            }
        });
    });
    
    // Chat item click to select chat
    document.querySelectorAll('.chat-item').forEach(item => {
        // Regular left click - select chat
        item.addEventListener('click', function(e) {
            // Only if we're not clicking on dropdown
            if (!e.target.closest('.dropdown')) {
                const chatId = this.dataset.id;
                selectChat(chatId);
            }
        });
        
        // Right click - show context menu
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault(); // Prevent default context menu
            e.stopPropagation(); // Stop propagation
            
            const dropdown = this.querySelector('.dropdown-menu');
            if (dropdown) {
                // Clone the dropdown and show it at cursor position
                showDropdownMenu(dropdown, e, true);
            }
        });
    });
}

/**
 * Shows a dropdown menu either as a context menu at cursor position or in its default position
 * @param {HTMLElement} menu - The dropdown menu element
 * @param {Event} event - The triggering event
 * @param {boolean} asContextMenu - Whether to show as context menu at cursor position
 */
function showDropdownMenu(menu, event, asContextMenu) {
    // First close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(item => {
        if (item.classList.contains('context-menu')) {
            item.remove();
        } else if (item !== menu) {
            item.classList.remove('active');
        }
    });
    
    // If showing as context menu, clone and position at cursor
    if (asContextMenu) {
        const clonedMenu = menu.cloneNode(true);
        clonedMenu.classList.add('context-menu');
        
        // Add click listeners to dropdown items in the cloned menu
        clonedMenu.querySelectorAll('.dropdown-item').forEach(menuItem => {
            menuItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const action = this.dataset.action;
                const chatId = this.dataset.chatId;
                
                // Handle the action
                handleDropdownAction(action, chatId);
                
                // Remove the context menu
                clonedMenu.remove();
            });
        });
        
        // Add to document body for absolute positioning
        document.body.appendChild(clonedMenu);
        
        // Position menu to avoid going off screen
        const menuWidth = 180; // Matching the CSS width
        const menuHeight = clonedMenu.offsetHeight || 150; // Estimate height if not yet rendered
        
        // Calculate optimal position
        let leftPos = event.clientX;
        let topPos = event.clientY;
        
        // Adjust if would go off screen
        if (leftPos + menuWidth > window.innerWidth) {
            leftPos = window.innerWidth - menuWidth - 10;
        }
        
        if (topPos + menuHeight > window.innerHeight) {
            topPos = window.innerHeight - menuHeight - 10;
        }
        
        // Position and show
        clonedMenu.style.left = `${leftPos}px`;
        clonedMenu.style.top = `${topPos}px`;
        clonedMenu.classList.add('active');
        
        // Add global click listener to close the context menu
        setTimeout(() => {
            const closeContextMenu = (evt) => {
                if (!clonedMenu.contains(evt.target)) {
                    clonedMenu.remove();
                    document.removeEventListener('click', closeContextMenu);
                }
            };
            document.addEventListener('click', closeContextMenu);
        }, 0);
    } else {
        // Toggle normal dropdown
        setTimeout(() => {
            menu.classList.toggle('active');
            
            // Check if dropdown would go off screen
            if (menu.classList.contains('active')) {
                const rect = menu.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const parentRect = menu.parentElement.getBoundingClientRect();
                
                // If menu would extend beyond viewport, position it above the trigger
                if (rect.bottom > viewportHeight) {
                    menu.style.top = 'auto';
                    menu.style.bottom = '100%';
                    menu.style.marginBottom = '5px';
                } else {
                    // Reset positioning if not needed
                    menu.style.top = '';
                    menu.style.bottom = '';
                    menu.style.marginBottom = '';
                }
            }
        }, 0);
    }
}

// Improved global click handler to better manage dropdowns
document.addEventListener('click', function(e) {
    // Only close regular dropdowns if clicking outside any dropdown
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu:not(.context-menu)').forEach(menu => {
            menu.classList.remove('active');
        });
    }
    
    // Always close context menus when clicking anywhere
    if (!e.target.closest('.dropdown-menu.context-menu')) {
        document.querySelectorAll('.dropdown-menu.context-menu').forEach(menu => {
            menu.remove();
        });
    }
});

// Function to toggle collapse state for all categories
function toggleCollapseAll() {
    // Toggle the global state
    allCategoriesCollapsed = !allCategoriesCollapsed;
    
    // Apply to all categories
    const categories = document.querySelectorAll('.chat-category');
    categories.forEach(category => {
        const categoryId = category.dataset.categoryId;
        const chatItems = category.querySelector('.category-items');
        const toggleIcon = category.querySelector('.category-header i');
        
        if (chatItems && toggleIcon) {
            if (allCategoriesCollapsed) {
                chatItems.classList.add('collapsed');
                toggleIcon.className = 'fas fa-chevron-right';
                collapsedCategories[categoryId] = true;
            } else {
                chatItems.classList.remove('collapsed');
                toggleIcon.className = 'fas fa-chevron-down';
                collapsedCategories[categoryId] = false;
            }
            
            // Log status if this is the unread category
            if (categoryId === 'unread') {
                console.log(`Unread category is now ${allCategoriesCollapsed ? 'collapsed' : 'expanded'}`);
            }
        }
    });
    
    // Update button state
    updateCollapseAllButtonState();
}

// Update the collapse all button state based on categories
function updateCollapseAllButtonState() {
    const collapseAllButton = document.querySelector('.collapse-all-button');
    if (!collapseAllButton) return;
    
    // If all categories are collapsed, show "expand all" state
    if (allCategoriesCollapsed) {
        collapseAllButton.title = "Expand All Categories";
        collapseAllButton.innerHTML = '<i class="fas fa-expand-alt"></i>';
        collapseAllButton.classList.add('active');
    } else {
        collapseAllButton.title = "Collapse All Categories";
        collapseAllButton.innerHTML = '<i class="fas fa-compress-alt"></i>';
        collapseAllButton.classList.remove('active');
    }
}

// Function to set up the search toggle functionality
function setupSearchToggle() {
    const toggleButton = document.querySelector('.toggle-search-button');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('chat-search');
    
    if (!toggleButton || !searchContainer || !searchInput) return;
    
    // Set initial state
    searchContainer.classList.toggle('active', isSearchVisible);
    
    // Toggle search visibility when the button is clicked
    toggleButton.addEventListener('click', function() {
        isSearchVisible = !isSearchVisible;
        searchContainer.classList.toggle('active', isSearchVisible);
        toggleButton.classList.toggle('active', isSearchVisible);
        
        // If showing search, focus the input with a more reliable approach
        if (isSearchVisible) {
            setTimeout(() => {
                searchInput.focus();
                setTimeout(() => {
                    if (document.activeElement !== searchInput) {
                        searchInput.focus();
                    }
                }, 50);
            }, 50);
        } else {
            // If hiding search, clear it
            searchInput.value = '';
            document.getElementById('clear-search').style.display = 'none';
            renderSidebar(); // Reset to show all chats
        }
        
        // Update icon based on state
        if (isSearchVisible) {
            toggleButton.innerHTML = '<i class="fas fa-times"></i>';
            toggleButton.title = "Close Search";
        } else {
            toggleButton.innerHTML = '<i class="fas fa-search"></i>';
            toggleButton.title = "Search Chats";
        }
    });
    
    // Add event listener for escape key when the search input is focused
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isSearchVisible) {
            isSearchVisible = false;
            searchContainer.classList.remove('active');
            toggleButton.classList.remove('active');
            
            // Clear search input
            searchInput.value = '';
            document.getElementById('clear-search').style.display = 'none';
            renderSidebar(); // Reset to show all chats
            
            // Update icon
            toggleButton.innerHTML = '<i class="fas fa-search"></i>';
            toggleButton.title = "Search Chats";
            
            searchInput.blur();
        }
    });
}

// Set up search functionality
function setupSearchFunctionality() {
    const searchInput = document.getElementById('chat-search');
    const clearButton = document.getElementById('clear-search');
    
    if (!searchInput || !clearButton) return;
    
    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        // Show/hide clear button based on search input
        clearButton.style.display = searchTerm ? 'block' : 'none';
        
        // Render filtered chat list
        renderSidebar(searchTerm);
    });
    
    // Clear button event listener
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.style.display = 'none';
        renderSidebar(); // Reset to show all chats
        searchInput.focus(); // Focus back on the search input
    });
    
    // Handle keyboard shortcuts
    searchInput.addEventListener('keydown', function(e) {
        // Escape key to clear search
        if (e.key === 'Escape') {
            searchInput.value = '';
            clearButton.style.display = 'none';
            renderSidebar();
            searchInput.blur(); // Remove focus from search
        }
        
        // Enter key to select first chat if available
        if (e.key === 'Enter') {
            const firstChat = document.querySelector('.chat-item');
            if (firstChat) {
                const chatId = firstChat.dataset.id;
                selectChat(chatId);
                searchInput.blur(); // Remove focus
            }
        }
    });
    
    // Shortcut for search focus: Ctrl+F or Command+F
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault(); // Prevent browser's default search
            searchInput.focus();
        }
    });
}

// Set up collapse all button functionality
function setupCollapseAllButton() {
    const collapseAllButton = document.querySelector('.collapse-all-button');
    if (!collapseAllButton) return;
    
    collapseAllButton.addEventListener('click', toggleCollapseAll);
    
    // Initialize button state
    updateCollapseAllButtonState();
}

// Handle dropdown item actions
function handleDropdownAction(action, chatId) {
    if (!isApiAvailable) return;
    
    switch (action) {
        case 'markAsRead':
            console.log(`Marking chat ${chatId} as read`);
            fetch('/api/markBubbleAsRead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bubbleId: chatId })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Mark as read response:', data);
                // Refresh data after marking as read
                fetchLiveBubbleData();
            })
            .catch(error => console.error('Error marking as read:', error));
            break;
        case 'toggleMute':
            console.log(`Toggle mute for chat ${chatId}`);
            // Implement when API is available
            break;
        case 'hide':
            console.log(`Hide chat ${chatId}`);
            // Implement when API is available
            break;
    }
}

// Function to select a chat and load its messages
function selectChat(chatId) {
    if (!isApiAvailable) return;
    
    // Check if this is an unread temporary ID
    if (chatId.startsWith('unread-')) {
        // Find the actual bubble by title
        const encodedTitle = chatId.substring(7); // Remove 'unread-' prefix
        const title = atob(encodedTitle);
        
        // Look for a matching chat with this title and a real ID
        let realChatId = null;
        
        // Check in direct messages
        const dmMatch = directMessages.find(chat => chat.title === title);
        if (dmMatch) realChatId = dmMatch.id;
        
        // If not found, check in categorized bubbles
        if (!realChatId) {
            for (const category in categorizedBubbles) {
                const match = categorizedBubbles[category].find(chat => chat.title === title);
                if (match) {
                    realChatId = match.id;
                    break;
                }
            }
        }
        
        // If still not found, check in uncategorized bubbles
        if (!realChatId) {
            const match = uncategorizedBubbles.find(chat => chat.title === title);
            if (match) realChatId = match.id;
        }
        
        // If found a real ID, use it instead
        if (realChatId) {
            console.log(`Resolved unread chat ID ${chatId} to real ID ${realChatId}`);
            chatId = realChatId;
        } else {
            console.error(`Could not find real ID for unread chat: ${title}`);
        }
    }
    
    // Store the current selected bubble ID
    currentSelectedBubbleId = chatId;
    
    // Find the chat in our data structures
    let selectedChat = null;
    
    // Check in direct messages
    selectedChat = directMessages.find(chat => chat.id == chatId);
    
    // If not found, check in categorized bubbles
    if (!selectedChat) {
        for (const category in categorizedBubbles) {
            selectedChat = categorizedBubbles[category].find(chat => chat.id == chatId);
            if (selectedChat) break;
        }
    }
    
    // If still not found, check in uncategorized bubbles
    if (!selectedChat) {
        selectedChat = uncategorizedBubbles.find(chat => chat.id == chatId);
    }
    
    if (!selectedChat) {
        console.error(`Chat with ID ${chatId} not found in any data structure`);
        return;
    }
    
    // Mark the selected chat item
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.dataset.id == chatId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Update header with the chat name
    if (window.updateChatHeader) {
        window.updateChatHeader(selectedChat.title, false); // Default to offline until we know
    }
    
    // Log chat info
    if (window.pywebview && window.pywebview.api && window.pywebview.api.print_chat_info) {
        window.pywebview.api.print_chat_info(selectedChat.title, chatId);
    }
    
    // Load messages for this chat
    loadBubbleMessages(chatId, selectedChat.title);
    
    // Dispatch custom event for chat selection
    const chatSelectedEvent = new CustomEvent('chatSelected', { 
        detail: { 
            chatId: chatId,
            chatName: selectedChat.title
        },
        bubbles: true 
    });
    document.dispatchEvent(chatSelectedEvent);
}

// Function to load messages for a bubble, first local then dynamic
async function loadBubbleMessages(bubbleId, chatName) {
    if (!isApiAvailable || !bubbleId) return;
    
    // Clear current messages
    if (window.clearMessages) {
        window.clearMessages();
    }
    
    // Show loading indicator
    if (window.showMessageLoadingIndicator) {
        window.showMessageLoadingIndicator();
    }
    
    try {
        // Start timer for local messages
        const localStartTime = performance.now();
        
        // Get local messages first using fetch API
        const localResponse = await fetch(`/api/get_Localmessages?bubbleID=${bubbleId}`);
        const localMessages = await localResponse.json();
        
        // Calculate local fetch time
        const localFetchTime = performance.now() - localStartTime;
        
        // Display local messages if available
        if (localMessages && localMessages.messages && localMessages.messages.length > 0) {
            if (window.renderMessages) {
                window.renderMessages(localMessages.messages, chatName);
            }
            
            // Show toast notification for local messages
            showToast(`Local messages loaded in ${Math.round(localFetchTime)}ms`, 'success');
        } else {
            if (window.showNoMessagesPlaceholder) {
                window.showNoMessagesPlaceholder();
            }
        }
        
        // Then get dynamic (live) messages
        const dynamicStartTime = performance.now();
        const dynamicResponse = await fetch(`/api/get_dynamicdetailed_messages?bubbleID=${bubbleId}`);
        const dynamicMessages = await dynamicResponse.json();
        
        // Calculate dynamic fetch time
        const dynamicFetchTime = performance.now() - dynamicStartTime;
        
        // Display dynamic messages if available and different from local
        if (dynamicMessages && dynamicMessages.messages && dynamicMessages.messages.length > 0) {
            if (window.renderMessages) {
                window.renderMessages(dynamicMessages.messages, chatName);
            }
            
            // Show toast notification for dynamic messages
            showToast(`Live messages loaded in ${Math.round(dynamicFetchTime)}ms`, 'info');
        }
    } catch (error) {
        console.error(`Error loading messages for bubble ${bubbleId}:`, error);
        showToast('Error loading messages', 'error');
    } finally {
        // Hide loading indicator
        if (window.hideMessageLoadingIndicator) {
            window.hideMessageLoadingIndicator();
        }
    }
}

// Function to trigger a refresh of messages for the current bubble
function triggerMessagesRefresh(bubbleId) {
    if (!bubbleId) return;
    
    // Find the chat in our data structures
    let selectedChat = null;
    
    // Check in direct messages
    selectedChat = directMessages.find(chat => chat.id == bubbleId);
    
    // If not found, check in categorized bubbles
    if (!selectedChat) {
        for (const category in categorizedBubbles) {
            selectedChat = categorizedBubbles[category].find(chat => chat.id == bubbleId);
            if (selectedChat) break;
        }
    }
    
    // If still not found, check in uncategorized bubbles
    if (!selectedChat) {
        selectedChat = uncategorizedBubbles.find(chat => chat.id == bubbleId);
    }
    
    if (!selectedChat) return;
    
    // Load fresh messages
    loadBubbleMessages(bubbleId, selectedChat.title);
}

// Toast notification function
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animation to show
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Improved global click handler to better manage dropdowns
document.addEventListener('click', function(e) {
    // Only close regular dropdowns if clicking outside any dropdown
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu:not(.context-menu)').forEach(menu => {
            menu.classList.remove('active');
        });
    }
    
    // Always close context menus when clicking anywhere
    if (!e.target.closest('.dropdown-menu.context-menu')) {
        document.querySelectorAll('.dropdown-menu.context-menu').forEach(menu => {
            menu.remove();
        });
    }
});

// Initialize the sidebar
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing sidebar');
    setupSearchFunctionality();
    setupSearchToggle();
    setupCollapseAllButton();
    
    // Check for API availability
    checkApiAvailability();
});

// Initialize immediately if DOM is already loaded
if (document.readyState === "complete" || 
    document.readyState === "loaded" || 
    document.readyState === "interactive") {
    console.log('DOM already ready - initializing sidebar immediately');
    setupSearchFunctionality();
    setupSearchToggle();
    setupCollapseAllButton();
    
    // Check for API availability
    checkApiAvailability();
}