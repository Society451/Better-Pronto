// Function to update the chat header with current chat information
function updateChatHeader(chatName, isOnline = false, profilePicUrl = null) {
    const chatHeaderContainer = document.getElementById('chat-header-container');
    if (!chatHeaderContainer) return;

    // Create the chat header structure
    let headerContent = `
        <div class="chat-header">
            <div class="contact-info">
                <div class="profile-picture">`;
    
    // Add profile picture or initials
    if (profilePicUrl) {
        headerContent += `
                    <img src="${profilePicUrl}" alt="${chatName}" class="profile-img" onerror="this.style.display='none'; this.parentNode.appendChild(createInitialsElement('${chatName.replace(/'/g, "\\'")}'))">`;
    } else {
        // We'll add initials after rendering the HTML
        headerContent += `<div class="profile-initials"></div>`;
    }
    
    // Add status indicator
    headerContent += `
                    <div class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}"></div>
                </div>
                <h3 id="chat-heading">${chatName || 'Select a chat'}</h3>
            </div>
            <div class="dropdown">
                <button class="dropdown-trigger" title="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                    <button class="dropdown-item" data-action="markAsRead">Mark as Read</button>
                    <button class="dropdown-item" data-action="togglePin">Pin</button>
                    <button class="dropdown-item" data-action="toggleMute">Mute</button>
                    <button class="dropdown-item" data-action="hide">Hide</button>
                    <button class="dropdown-item" data-action="setNickname">Nickname</button>
                    <button class="dropdown-item" data-action="leave">Leave</button>
                </div>
            </div>
        </div>
    `;
    
    chatHeaderContainer.innerHTML = headerContent;
    
    // If no profile picture URL, add initials
    if (!profilePicUrl) {
        const initialsContainer = chatHeaderContainer.querySelector('.profile-initials');
        if (initialsContainer && chatName) {
            // Create initials element
            const initialsElement = createInitialsElement(chatName);
            // Replace the empty placeholder
            initialsContainer.parentNode.replaceChild(initialsElement, initialsContainer);
        }
    }
    
    // Set up dropdown event listeners
    setupHeaderDropdown();
}

// Helper function to create an element displaying user initials
function createInitialsElement(fullName) {
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
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
}

// Set up event listeners for the header dropdown
function setupHeaderDropdown() {
    const trigger = document.querySelector('.chat-header .dropdown-trigger');
    if (!trigger) return;
    
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = this.nextElementSibling;
        menu.classList.toggle('active');
    });
    
    // Handle dropdown item clicks
    const dropdownItems = document.querySelectorAll('.chat-header .dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.dataset.action;
            
            // Handle header dropdown actions
            handleHeaderAction(action);
            
            // Close dropdown
            const menu = this.closest('.dropdown-menu');
            if (menu) menu.classList.remove('active');
        });
    });
}

// Handle header dropdown actions
function handleHeaderAction(action) {
    const chatName = document.getElementById('chat-heading').textContent;
    
    switch(action) {
        case 'togglePin':
            alert(`${chatName} has been pinned`);
            break;
        case 'toggleMute':
            alert(`${chatName} has been muted`);
            break;
        case 'setNickname':
            const newName = prompt('Enter new nickname:', chatName);
            if (newName && newName.trim()) {
                document.getElementById('chat-heading').textContent = newName.trim();
                
                // Dispatch custom event so other components can update
                const nicknameEvent = new CustomEvent('chatNickname', { 
                    detail: { 
                        chatName: chatName,
                        newName: newName.trim() 
                    },
                    bubbles: true 
                });
                document.dispatchEvent(nicknameEvent);
            }
            break;
        case 'leave':
            if (confirm(`Are you sure you want to leave the chat with ${chatName}?`)) {
                alert(`You have left the chat with ${chatName}`);
                // In a real app, we would redirect or clear the chat
            }
            break;
        default:
            alert(`Action ${action} for ${chatName}`);
    }
}

// Initialize the header
document.addEventListener('DOMContentLoaded', function() {
    // Default header with name (will be updated when chat is selected)
    updateChatHeader('Select a chat', false); 
    
    // Listen for chat selection events
    document.addEventListener('chatSelected', function(e) {
        if (e.detail) {
            updateChatHeader(
                e.detail.chatName, 
                e.detail.isOnline || false,
                e.detail.profilePicUrl || null
            );
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.chat-header .dropdown')) {
            document.querySelectorAll('.chat-header .dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
});

// Make updateChatHeader function available globally
window.updateChatHeader = updateChatHeader;

// Initialize immediately if DOM is already loaded
if (document.readyState === "complete" || 
    document.readyState === "loaded" || 
    document.readyState === "interactive") {
    updateChatHeader('Select a chat', false);
}