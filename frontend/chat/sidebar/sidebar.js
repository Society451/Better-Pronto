// Data structures for chats
let directMessages = [];
let categorizedBubbles = {};
let uncategorizedBubbles = [];
let unreadBubbles = [];
let categories = [];

// State tracking variables
let isApiAvailable = false;
let isDataLoaded = false;
let isLiveDataLoading = false;
let currentSearchTerm = '';
let isSearchVisible = false;
let collapsedCategories = {};
let currentSelectedBubbleId = null;
let allCategoriesCollapsed = false;

// API methods wrapper
const api = {
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

// Check API availability recursively until available
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

// Initial data loading from local storage
async function loadInitialChatData() {
    try {
        console.log('Loading initial chat data from local storage...');
        
        // Load local data in parallel
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
        
        // Then fetch live data in the background
        fetchLiveBubbleData();
    } catch (error) {
        console.error('Error loading initial chat data:', error);
        setTimeout(loadInitialChatData, 2000);
    }
}

// Fetch live data from server
async function fetchLiveBubbleData() {
    if (isLiveDataLoading) return;
    
    try {
        isLiveDataLoading = true;
        console.log('Fetching live bubble data...');
        
        // Call API to get live bubbles data
        const liveBubblesResponse = await fetch('/api/get_live_bubbles');
        if (!liveBubblesResponse.ok) {
            throw new Error(`Failed to fetch live bubbles: ${liveBubblesResponse.status}`);
        }
        console.log('Live bubble data fetched and saved');
        
        // Reload data from local storage
        const [dmsResponse, categorizedChatsResponse, uncategorizedChatsResponse, unreadChatsResponse, categoryListResponse] = await Promise.all([
            fetch('/api/get_Localdms'),
            fetch('/api/get_Localcategorized_bubbles'),
            fetch('/api/get_Localuncategorized_bubbles'),
            fetch('/api/get_Localunread_bubbles'),
            fetch('/api/get_Localcategories')
        ]);
        
        // Parse and update data
        directMessages = await dmsResponse.json() || [];
        categorizedBubbles = await categorizedChatsResponse.json() || {};
        uncategorizedBubbles = await uncategorizedChatsResponse.json() || [];
        unreadBubbles = await unreadChatsResponse.json() || [];
        categories = await categoryListResponse.json() || [];
        
        console.log('Updated chat data loaded');
        
        isDataLoaded = true;
        renderSidebar(currentSearchTerm);
        
        // Refresh messages if there's a selected bubble
        if (currentSelectedBubbleId) {
            triggerMessagesRefresh(currentSelectedBubbleId);
        }
    } catch (error) {
        console.error('Error fetching live bubble data:', error);
    } finally {
        isLiveDataLoading = false;
        setTimeout(fetchLiveBubbleData, 60000); // Refresh every minute
    }
}

// Render sidebar with all chat categories
function renderSidebar(searchTerm = '') {
    const chatList = document.getElementById('chat-list');
    if (!chatList || !isDataLoaded) {
        console.error(isDataLoaded ? 'Chat list element not found' : 'Chat data not loaded yet');
        return;
    }
    
    // Store search term and clear list
    currentSearchTerm = searchTerm.toLowerCase().trim();
    chatList.innerHTML = '';
    
    // Show loading indicator if data is not loaded
    if (!isDataLoaded) {
        chatList.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>Loading chats...</span>
            </div>`;
        return;
    }
    
    // Render unread messages section
    const filteredUnreadBubbles = filterChatsBySearch(unreadBubbles, currentSearchTerm);
    if (filteredUnreadBubbles.length > 0) {
        // Process unread bubbles to ensure valid IDs
        const processedUnreadBubbles = processUnreadBubbles(filteredUnreadBubbles);
        
        // Initialize unread category collapsed state
        if (collapsedCategories['unread'] === undefined) {
            collapsedCategories['unread'] = false;
        }
        
        if (allCategoriesCollapsed) {
            collapsedCategories['unread'] = true;
        }
        
        renderChatCategory('Unread', processedUnreadBubbles, 'unread', chatList);
    }
    
    // Render other categories
    renderChatCategory('Direct Messages', filterChatsBySearch(directMessages, currentSearchTerm), 'dm', chatList);
    
    // Render categorized bubbles
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
    
    // Show updating indicator if loading live data
    if (isLiveDataLoading) {
        const updatingIndicator = document.createElement('div');
        updatingIndicator.className = 'updating-indicator';
        updatingIndicator.textContent = 'Updating...';
        chatList.appendChild(updatingIndicator);
    }
    
    // Show no results message if needed
    if (currentSearchTerm && chatList.childElementCount === (isLiveDataLoading ? 1 : 0)) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No chats found matching your search';
        chatList.appendChild(noResults);
    }
    
    setupEventListeners();
    updateCollapseAllButtonState();
}

// Filter chats based on search term
function filterChatsBySearch(chats, searchTerm) {
    if (!searchTerm) return chats;
    return chats.filter(chat => chat.title && chat.title.toLowerCase().includes(searchTerm));
}

// Process unread bubbles to ensure they have valid IDs
function processUnreadBubbles(unreadBubbles) {
    return unreadBubbles.map(bubble => {
        // Set ID from bubble_id if available
        if (!bubble.id && bubble.bubble_id) {
            bubble.id = bubble.bubble_id;
        } else if (!bubble.id) {
            // Try to find matching bubble in other collections
            const matchInDMs = directMessages.find(dm => dm.title === bubble.title);
            if (matchInDMs) {
                bubble.id = matchInDMs.id;
            } else {
                // Check categorized bubbles
                for (const category in categorizedBubbles) {
                    const match = categorizedBubbles[category].find(chat => chat.title === bubble.title);
                    if (match) {
                        bubble.id = match.id;
                        break;
                    }
                }
                
                // Check uncategorized bubbles if still not found
                if (!bubble.id) {
                    const match = uncategorizedBubbles.find(chat => chat.title === bubble.title);
                    if (match) bubble.id = match.id;
                }
            }
        }
        
        // Create temporary ID if still not found
        if (!bubble.id) {
            console.log(`Creating temporary ID for unread bubble: ${bubble.title}`);
            bubble.id = `unread-${btoa(bubble.title)}`;
        }
        
        return bubble;
    });
}

// Render a chat category with collapsible header
function renderChatCategory(categoryName, chats, categoryId, container) {
    if (!chats || chats.length === 0) return;
    
    // Create category container and header
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'chat-category';
    categoryContainer.dataset.categoryId = categoryId;
    
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    
    const toggleIcon = document.createElement('i');
    toggleIcon.className = collapsedCategories[categoryId] 
        ? 'fas fa-chevron-right' 
        : 'fas fa-chevron-down';
    
    const categoryTitle = document.createElement('span');
    categoryTitle.className = 'category-title';
    categoryTitle.textContent = `${categoryName} (${chats.length})`;
    
    categoryHeader.appendChild(toggleIcon);
    categoryHeader.appendChild(categoryTitle);
    
    // Toggle collapse on click
    categoryHeader.addEventListener('click', (event) => {
        event.stopPropagation();
        
        const chatItems = categoryContainer.querySelector('.category-items');
        if (!chatItems) return;
        
        const isCollapsed = !chatItems.classList.contains('collapsed');
        
        // Update UI
        chatItems.classList.toggle('collapsed', isCollapsed);
        toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
        
        // Store state
        collapsedCategories[categoryId] = isCollapsed;
        
        updateCollapseAllButtonState();
    });
    
    categoryContainer.appendChild(categoryHeader);
    
    // Create container for chat items
    const chatItemsContainer = document.createElement('div');
    chatItemsContainer.className = 'category-items';
    if (collapsedCategories[categoryId]) {
        chatItemsContainer.classList.add('collapsed');
    }
    
    // Add chat items
    chats.forEach((chat, index) => {
        if (!chat.id || !chat.title) {
            console.warn(`Skipping invalid chat item:`, chat);
            return;
        }
        
        chatItemsContainer.appendChild(createChatItem(chat));
    });
    
    categoryContainer.appendChild(chatItemsContainer);
    container.appendChild(categoryContainer);
}

// Create user initials element
function createInitialsElement(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        fullName = 'Unknown';
    }
    
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'profile-initials';
    
    // Extract initials (up to two characters)
    const initials = fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    
    initialsDiv.textContent = initials;
    
    // Generate consistent color based on name
    const hue = stringToHue(fullName);
    initialsDiv.style.backgroundColor = `hsl(${hue}, 60%, 80%)`;
    initialsDiv.style.color = `hsl(${hue}, 80%, 30%)`;
    
    return initialsDiv;
}

// Generate consistent hue from string
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
        return document.createElement('div');
    }
    
    const isUnreadItem = chat.unread !== undefined;
    
    // Handle ID for unread items
    if (!chat.id && isUnreadItem) {
        chat.id = `unread-${btoa(chat.title)}`;
    }
    
    if (!chat.id) {
        console.warn(`Chat missing ID:`, chat);
        return document.createElement('div');
    }
    
    // Create chat item container
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.id = chat.id;
    
    // Create profile picture
    const profilePic = document.createElement('div');
    profilePic.className = 'profile-picture';
    
    if (chat.profilepicurl) {
        const img = document.createElement('img');
        img.src = chat.profilepicurl;
        img.alt = chat.title;
        img.className = 'profile-img';
        
        img.onerror = () => {
            img.style.display = 'none';
            profilePic.appendChild(createInitialsElement(chat.title));
        };
        
        profilePic.appendChild(img);
    } else {
        profilePic.appendChild(createInitialsElement(chat.title));
    }
    
    // Add status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator status-offline';
    profilePic.appendChild(statusIndicator);
    
    // Create chat content
    const chatContent = document.createElement('div');
    chatContent.className = 'chat-content';
    
    const chatName = document.createElement('div');
    chatName.className = 'chat-name';
    
    if (currentSearchTerm) {
        chatName.innerHTML = highlightText(chat.title, currentSearchTerm);
    } else {
        chatName.textContent = chat.title;
    }
    
    chatContent.appendChild(chatName);
    
    // Add preview text for non-unread items
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
    
    // Add dropdown options
    [
        { text: 'Mark as Read', action: 'markAsRead' },
        { text: 'Mute', action: 'toggleMute' },
        { text: 'Hide', action: 'hide' }
    ].forEach(option => {
        const button = document.createElement('button');
        button.className = 'dropdown-item';
        button.textContent = option.text;
        button.dataset.action = option.action;
        button.dataset.chatId = chat.id;
        dropdownMenu.appendChild(button);
    });
    
    dropdown.appendChild(dropdownTrigger);
    dropdown.appendChild(dropdownMenu);
    
    // Assemble chat item
    chatItem.appendChild(profilePic);
    chatItem.appendChild(chatContent);
    chatItem.appendChild(dropdown);
    
    // Add unread badge if needed
    if (isUnreadItem) {
        const unreadBadge = document.createElement('div');
        
        if (chat.unread_mentions > 0) {
            unreadBadge.className = 'unread-badge mentions';
            unreadBadge.textContent = chat.unread_mentions;
        } else {
            unreadBadge.className = 'unread-badge';
            unreadBadge.textContent = chat.unread >= 100 ? '99+' : chat.unread;
        }
        
        chatItem.appendChild(unreadBadge);
    }
    
    return chatItem;
}

// Highlight search term in text
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text || '';
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Escape special characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Set up all event listeners
function setupEventListeners() {
    // Dropdown trigger click handlers
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            showDropdownMenu(this.nextElementSibling, e, false);
        });
    });
    
    // Dropdown item click handlers
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            handleDropdownAction(this.dataset.action, this.dataset.chatId);
            
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
    
    // Chat item click handlers
    document.querySelectorAll('.chat-item').forEach(item => {
        // Left click to select chat
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown')) {
                selectChat(this.dataset.id);
            }
        });
        
        // Right click to show context menu
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.querySelector('.dropdown-menu');
            if (dropdown) {
                showDropdownMenu(dropdown, e, true);
            }
        });
    });
}

// Show dropdown menu
function showDropdownMenu(menu, event, asContextMenu) {
    // First close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(item => {
        if (item.classList.contains('context-menu')) {
            item.remove();
        } else if (item !== menu) {
            item.classList.remove('active');
        }
    });
    
    // Handle context menu (right-click)
    if (asContextMenu) {
        const clonedMenu = menu.cloneNode(true);
        clonedMenu.classList.add('context-menu');
        
        // Add event listeners to cloned menu items
        clonedMenu.querySelectorAll('.dropdown-item').forEach(menuItem => {
            menuItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                handleDropdownAction(this.dataset.action, this.dataset.chatId);
                clonedMenu.remove();
            });
        });
        
        document.body.appendChild(clonedMenu);
        
        // Position optimally
        const menuWidth = 180;
        const menuHeight = clonedMenu.offsetHeight || 150;
        
        let leftPos = event.clientX;
        let topPos = event.clientY;
        
        if (leftPos + menuWidth > window.innerWidth) {
            leftPos = window.innerWidth - menuWidth - 10;
        }
        
        if (topPos + menuHeight > window.innerHeight) {
            topPos = window.innerHeight - menuHeight - 10;
        }
        
        clonedMenu.style.left = `${leftPos}px`;
        clonedMenu.style.top = `${topPos}px`;
        clonedMenu.classList.add('active');
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeContextMenu(evt) {
                if (!clonedMenu.contains(evt.target)) {
                    clonedMenu.remove();
                    document.removeEventListener('click', closeContextMenu);
                }
            });
        }, 0);
    } else {
        // Handle regular dropdown (three dots)
        const trigger = menu.previousElementSibling;
        const triggerRect = trigger.getBoundingClientRect();
        
        menu.classList.toggle('active');
        
        if (menu.classList.contains('active')) {
            // Clone and position properly
            const clonedMenu = menu.cloneNode(true);
            clonedMenu.classList.add('fixed-dropdown');
            
            clonedMenu.querySelectorAll('.dropdown-item').forEach(menuItem => {
                menuItem.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    handleDropdownAction(this.dataset.action, this.dataset.chatId);
                    document.body.removeChild(clonedMenu);
                    menu.classList.remove('active');
                });
            });
            
            document.body.appendChild(clonedMenu);
            
            const leftPos = triggerRect.right - clonedMenu.offsetWidth;
            const topPos = triggerRect.top;
            
            clonedMenu.style.position = 'fixed';
            clonedMenu.style.left = `${leftPos}px`;
            clonedMenu.style.top = `${topPos}px`;
            
            clonedMenu.dataset.originalMenuId = menu.id || `menu-${Math.random().toString(36).substr(2, 9)}`;
            if (!menu.id) {
                menu.id = clonedMenu.dataset.originalMenuId;
            }
            
            // Close on click outside
            setTimeout(() => {
                document.addEventListener('click', function closeDropdown(evt) {
                    if (!clonedMenu.contains(evt.target) && !trigger.contains(evt.target)) {
                        document.body.removeChild(clonedMenu);
                        menu.classList.remove('active');
                        document.removeEventListener('click', closeDropdown);
                    }
                });
            }, 0);
        } else {
            // Remove any existing clones
            document.querySelectorAll('.fixed-dropdown').forEach(clone => {
                if (clone.dataset.originalMenuId === menu.id) {
                    document.body.removeChild(clone);
                }
            });
        }
    }
}

// Global click handler for dropdowns
document.addEventListener('click', function(e) {
    // Close regular dropdowns
    if (!e.target.closest('.dropdown') && !e.target.closest('.fixed-dropdown')) {
        document.querySelectorAll('.dropdown-menu:not(.context-menu)').forEach(menu => {
            menu.classList.remove('active');
        });
        
        // Remove cloned menus
        document.querySelectorAll('.fixed-dropdown').forEach(menu => {
            document.body.removeChild(menu);
        });
    }
    
    // Close context menus
    if (!e.target.closest('.dropdown-menu.context-menu')) {
        document.querySelectorAll('.dropdown-menu.context-menu').forEach(menu => {
            menu.remove();
        });
    }
});

// Toggle collapse state for all categories
function toggleCollapseAll() {
    allCategoriesCollapsed = !allCategoriesCollapsed;
    
    document.querySelectorAll('.chat-category').forEach(category => {
        const categoryId = category.dataset.categoryId;
        const chatItems = category.querySelector('.category-items');
        const toggleIcon = category.querySelector('.category-header i');
        
        if (chatItems && toggleIcon) {
            chatItems.classList.toggle('collapsed', allCategoriesCollapsed);
            toggleIcon.className = allCategoriesCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
            collapsedCategories[categoryId] = allCategoriesCollapsed;
        }
    });
    
    updateCollapseAllButtonState();
}

// Update collapse button state
function updateCollapseAllButtonState() {
    const collapseAllButton = document.querySelector('.collapse-all-button');
    if (!collapseAllButton) return;
    
    collapseAllButton.title = allCategoriesCollapsed ? "Expand All Categories" : "Collapse All Categories";
    collapseAllButton.innerHTML = allCategoriesCollapsed ? '<i class="fas fa-expand-alt"></i>' : '<i class="fas fa-compress-alt"></i>';
    collapseAllButton.classList.toggle('active', allCategoriesCollapsed);
}

// Set up search toggle functionality
function setupSearchToggle() {
    const toggleButton = document.querySelector('.toggle-search-button');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('chat-search');
    
    if (!toggleButton || !searchContainer || !searchInput) return;
    
    searchContainer.classList.toggle('active', isSearchVisible);
    
    toggleButton.addEventListener('click', function() {
        isSearchVisible = !isSearchVisible;
        searchContainer.classList.toggle('active', isSearchVisible);
        toggleButton.classList.toggle('active', isSearchVisible);
        
        if (isSearchVisible) {
            // Focus search input
            setTimeout(() => {
                searchInput.focus();
                if (document.activeElement !== searchInput) {
                    setTimeout(() => searchInput.focus(), 50);
                }
            }, 50);
        } else {
            // Clear search
            searchInput.value = '';
            document.getElementById('clear-search').style.display = 'none';
            renderSidebar();
        }
        
        // Update icon
        toggleButton.innerHTML = isSearchVisible ? '<i class="fas fa-times"></i>' : '<i class.lang="en" class="fas fa-search"></i>';
        toggleButton.title = isSearchVisible ? "Close Search" : "Search Chats";
    });
    
    // Handle escape key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isSearchVisible) {
            isSearchVisible = false;
            searchContainer.classList.remove('active');
            toggleButton.classList.remove('active');
            searchInput.value = '';
            document.getElementById('clear-search').style.display = 'none';
            renderSidebar();
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
    
    // Handle input changes
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        clearButton.style.display = searchTerm ? 'block' : 'none';
        renderSidebar(searchTerm);
    });
    
    // Clear button handler
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.style.display = 'none';
        renderSidebar();
        searchInput.focus();
    });
    
    // Keyboard shortcuts
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Escape key to clear search
            searchInput.value = '';
            clearButton.style.display = 'none';
            renderSidebar();
            searchInput.blur();
        } else if (e.key === 'Enter') {
            // Enter key to select first chat
            const firstChat = document.querySelector('.chat-item');
            if (firstChat) {
                selectChat(firstChat.dataset.id);
                searchInput.blur();
            }
        }
    });
    
    // Global search shortcut
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// Set up collapse all button
function setupCollapseAllButton() {
    const collapseAllButton = document.querySelector('.collapse-all-button');
    if (!collapseAllButton) return;
    
    collapseAllButton.addEventListener('click', toggleCollapseAll);
    updateCollapseAllButtonState();
}

// Handle dropdown actions
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
                fetchLiveBubbleData();
            })
            .catch(error => console.error('Error marking as read:', error));
            break;
        case 'toggleMute':
        case 'hide':
            console.log(`Action ${action} for chat ${chatId} - not yet implemented`);
            break;
    }
}

// Select a chat and load its messages
function selectChat(chatId) {
    if (!isApiAvailable) return;
    
    // Resolve unread temporary IDs
    if (chatId.startsWith('unread-')) {
        const encodedTitle = chatId.substring(7);
        const title = atob(encodedTitle);
        let realChatId = null;
        
        // Find real ID by title matching
        const dmMatch = directMessages.find(chat => chat.title === title);
        if (dmMatch) realChatId = dmMatch.id;
        
        if (!realChatId) {
            // Check categorized bubbles
            for (const category in categorizedBubbles) {
                const match = categorizedBubbles[category].find(chat => chat.title === title);
                if (match) {
                    realChatId = match.id;
                    break;
                }
            }
        }
        
        if (!realChatId) {
            const match = uncategorizedBubbles.find(chat => chat.title === title);
            if (match) realChatId = match.id;
        }
        
        if (realChatId) {
            console.log(`Resolved unread chat ID ${chatId} to real ID ${realChatId}`);
            chatId = realChatId;
        }
    }
    
    currentSelectedBubbleId = chatId;
    
    // Find the chat in our data structures
    let selectedChat = null;
    
    // Check in various collections
    selectedChat = directMessages.find(chat => chat.id == chatId);
    
    if (!selectedChat) {
        for (const category in categorizedBubbles) {
            selectedChat = categorizedBubbles[category].find(chat => chat.id == chatId);
            if (selectedChat) break;
        }
    }
    
    if (!selectedChat) {
        selectedChat = uncategorizedBubbles.find(chat => chat.id == chatId);
    }
    
    if (!selectedChat) {
        console.error(`Chat with ID ${chatId} not found`);
        return;
    }
    
    // Update UI selection
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.id == chatId);
    });
    
    // Update chat header
    if (window.updateChatHeader) {
        window.updateChatHeader(selectedChat.title, false);
    }
    
    // Show message container and input bar when a chat is selected
    const messagesContainer = document.getElementById('messages-container');
    const messageInputContainer = document.getElementById('message-input-container');
    
    if (messagesContainer) {
        messagesContainer.style.display = 'block';
    }
    
    if (messageInputContainer) {
        messageInputContainer.style.display = 'block';
    }
    
    // Update URL with chat ID for routing
    const chatUrl = `/chat/${chatId}`;
    history.pushState({ chatId: chatId }, selectedChat.title, chatUrl);
    document.title = `${selectedChat.title} - Better Pronto`;
    
    // Log chat info if API available
    if (window.pywebview?.api?.print_chat_info) {
        window.pywebview.api.print_chat_info(selectedChat.title, chatId);
    }
    
    // Load messages
    loadBubbleMessages(chatId, selectedChat.title);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('chatSelected', { 
        detail: { chatId, chatName: selectedChat.title },
        bubbles: true 
    }));
}

// Load messages for a bubble
async function loadBubbleMessages(bubbleId, chatName) {
    if (!isApiAvailable || !bubbleId) return;
    
    // Clear current messages
    if (window.clearMessages) window.clearMessages();
    
    // Show loading indicator
    if (window.showMessageLoadingIndicator) window.showMessageLoadingIndicator();
    
    try {
        // Get local messages
        const localStartTime = performance.now();
        const localResponse = await fetch(`/api/get_Localmessages?bubbleID=${bubbleId}`);
        const localMessages = await localResponse.json();
        const localFetchTime = performance.now() - localStartTime;
        
        // Display local messages
        if (localMessages?.messages?.length > 0) {
            if (window.renderMessages) {
                window.renderMessages(localMessages.messages, chatName);
            }
            showToast(`Local messages loaded in ${Math.round(localFetchTime)}ms`, 'success');
        } else if (window.showNoMessagesPlaceholder) {
            window.showNoMessagesPlaceholder();
        }
        
        // Get dynamic messages
        const dynamicStartTime = performance.now();
        const dynamicResponse = await fetch(`/api/get_dynamicdetailed_messages?bubbleID=${bubbleId}`);
        const dynamicMessages = await dynamicResponse.json();
        const dynamicFetchTime = performance.now() - dynamicStartTime;
        
        // Display dynamic messages if available
        if (dynamicMessages?.messages?.length > 0) {
            if (window.renderMessages) {
                window.renderMessages(dynamicMessages.messages, chatName);
            }
            showToast(`Live messages loaded in ${Math.round(dynamicFetchTime)}ms`, 'info');
        }
    } catch (error) {
        console.error(`Error loading messages for bubble ${bubbleId}:`, error);
        showToast('Error loading messages', 'error');
    } finally {
        if (window.hideMessageLoadingIndicator) window.hideMessageLoadingIndicator();
    }
}

// Refresh messages for current bubble
function triggerMessagesRefresh(bubbleId) {
    if (!bubbleId) return;
    
    // Find chat in data collections
    let selectedChat = directMessages.find(chat => chat.id == bubbleId);
    
    if (!selectedChat) {
        for (const category in categorizedBubbles) {
            selectedChat = categorizedBubbles[category].find(chat => chat.id == bubbleId);
            if (selectedChat) break;
        }
    }
    
    if (!selectedChat) {
        selectedChat = uncategorizedBubbles.find(chat => chat.id == bubbleId);
    }
    
    if (selectedChat) {
        loadBubbleMessages(bubbleId, selectedChat.title);
    }
}

// Toast notification display
function showToast(message, type = 'info', duration = 3000) {
    // Create container if needed
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Set up settings button functionality
function setupSettingsButton() {
    const settingsButton = document.querySelector('.settings-button');
    if (!settingsButton) return;
    
    // Create settings menu if it doesn't exist
    let settingsMenu = document.querySelector('.settings-menu');
    if (!settingsMenu) {
        settingsMenu = document.createElement('div');
        settingsMenu.className = 'settings-menu';
        settingsMenu.innerHTML = `
            <button class="settings-menu-item" data-action="account">
                <i class="fas fa-user-circle fa-fw"></i> Account Settings
            </button>
            <button class="settings-menu-item" data-action="appearance">
                <i class="fas fa-palette fa-fw"></i> Appearance
            </button>
            <button class="settings-menu-item" data-action="notifications">
                <i class="fas fa-bell fa-fw"></i> Notifications
            </button>
            <div class="settings-menu-separator"></div>
            <button class="settings-menu-item" data-action="preferences">
                <i class="fas fa-sliders-h fa-fw"></i> Preferences
            </button>
            <button class="settings-menu-item" data-action="help">
                <i class="fas fa-question-circle fa-fw"></i> Help & Support
            </button>
            <div class="settings-menu-separator"></div>
            <button class="settings-menu-item" data-action="logout">
                <i class="fas fa-sign-out-alt fa-fw"></i> Logout
            </button>
        `;
        document.querySelector('.sidebar-header').appendChild(settingsMenu);
        
        // Add event listeners to menu items
        settingsMenu.querySelectorAll('.settings-menu-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                handleSettingsAction(this.dataset.action);
                settingsMenu.classList.remove('active');
                settingsButton.classList.remove('active');
            });
        });
    }
    
    // Toggle settings menu on button click
    settingsButton.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const isActive = !settingsMenu.classList.contains('active');
        settingsMenu.classList.toggle('active', isActive);
        settingsButton.classList.toggle('active', isActive);
    });
    
    // Close settings menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!settingsMenu.contains(e.target) && !settingsButton.contains(e.target)) {
            settingsMenu.classList.remove('active');
            settingsButton.classList.remove('active');
        }
    });
}

// Handle settings menu actions
function handleSettingsAction(action) {
    if (!isApiAvailable) return;
    
    switch (action) {
        case 'account':
            console.log('Opening account settings');
            showToast('Account settings feature coming soon', 'info');
            break;
        case 'appearance':
            console.log('Opening appearance settings');
            showToast('Appearance settings feature coming soon', 'info');
            break;
        case 'notifications':
            console.log('Opening notification settings');
            showToast('Notification settings feature coming soon', 'info');
            break;
        case 'preferences':
            console.log('Opening preferences');
            showToast('Preferences feature coming soon', 'info');
            break;
        case 'help':
            console.log('Opening help & support');
            showToast('Help & support feature coming soon', 'info');
            break;
        case 'logout':
            if (confirm('Are you sure you want to logout?')) {
                console.log('Logging out');
                fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        window.location.href = '/login';
                    } else {
                        showToast('Logout failed: ' + (data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(error => {
                    console.error('Error during logout:', error);
                    showToast('Logout failed. Please try again.', 'error');
                });
            }
            break;
        default:
            console.log(`Unknown settings action: ${action}`);
    }
}

// Initialize sidebar
function init() {
    setupSearchFunctionality();
    setupSearchToggle();
    setupCollapseAllButton();
    setupSettingsButton();  // Add this line
    checkApiAvailability();
    
    // Handle route-based navigation for URLs like /chat/chatId
    handleURLRouting();
}

// Handle URL-based routing to load specific chats
function handleURLRouting() {
    // Check if URL has a chat route
    const path = window.location.pathname;
    const chatRouteMatch = path.match(/\/chat\/([^\/]+)/);
    
    if (chatRouteMatch && chatRouteMatch[1]) {
        const chatId = chatRouteMatch[1];
        console.log(`Found chat ID ${chatId} in URL, will select after data loads`);
        
        // Create a function to check and select the chat once data is loaded
        const attemptChatSelection = function() {
            // Wait until data is loaded
            if (!isDataLoaded) {
                setTimeout(attemptChatSelection, 500);
                return;
            }
            
            // Try to find the chat in our data
            let chatExists = false;
            
            // Check in direct messages
            if (directMessages.some(chat => chat.id == chatId)) {
                chatExists = true;
            }
            
            // Check in categorized bubbles if not found
            if (!chatExists) {
                for (const category in categorizedBubbles) {
                    if (categorizedBubbles[category].some(chat => chat.id == chatId)) {
                        chatExists = true;
                        break;
                    }
                }
            }
            
            // Check in uncategorized bubbles if still not found
            if (!chatExists && uncategorizedBubbles.some(chat => chat.id == chatId)) {
                chatExists = true;
            }
            
            if (chatExists) {
                console.log(`Selecting chat ${chatId} from URL route`);
                selectChat(chatId);
            } else {
                console.error(`Chat with ID ${chatId} from URL not found in loaded data`);
            }
        };
        
        // Start attempting to select the chat
        attemptChatSelection();
    }
}

// Initialize as soon as DOM is ready
if (document.readyState === "complete" || 
    document.readyState === "loaded" || 
    document.readyState === "interactive") {
    console.log('DOM already ready - initializing sidebar immediately');
    init();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded - initializing sidebar');
        init();
    });
}