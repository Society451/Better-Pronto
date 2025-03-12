const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchContainer = document.querySelector('.search-container');
const clearSearch = document.getElementById('clear-search');
const toggleAllButton = document.getElementById('toggle-all');
const chatHeading = document.getElementById('chat-heading');

let lastSender = null; // Track the last message sender
const hasDeletePermission = true; // Message Delete permission
let isShiftPressed = false; // Track if Shift key is pressed
let currentChatID = null; // Track the current chat ID


function updateUnreadCounts() {
    document.querySelectorAll('.chat-item').forEach(chatItem => {
        const unreadCountElement = chatItem.querySelector('.unread-count');
        const unreadCount = parseInt(unreadCountElement.textContent, 10);
        const hasUnreadMentions = chatItem.getAttribute('data-has-unread-mentions') === 'true';
        const isDM = chatItem.getAttribute('data-is-dm') === 'true';

        if (unreadCount === 0) {
            unreadCountElement.style.display = 'none'; // Hide unread count bubble with 0 unread messages
        } else {
            unreadCountElement.style.display = 'inline-block'; // Show unread count bubble with unread messages
            if (isDM) {
                unreadCountElement.style.backgroundColor = 'red'; // Red background for DMs
                unreadCountElement.style.color = 'white'; // White text for DMs
            } else if (hasUnreadMentions) {
                unreadCountElement.style.backgroundColor = 'red'; // Red background for unread mentions
                unreadCountElement.style.color = 'white'; // White text for unread mentions
            } else {
                unreadCountElement.style.backgroundColor = 'grey'; // Grey background for simple unread messages
                unreadCountElement.style.color = 'white'; // White text for simple unread messages
            }
        }
    });
}


// Function to set chat heading dynamically
function setChatHeading(name) {
    chatHeading.textContent = name;
}

// Example usage of setChatHeading
setChatHeading('Dynamic Chat Heading');

// Detect Shift key press and release
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

// Message class to create message elements
class Message {
    constructor(content, sender, timestamp, user, isDefault = false, editCount = 0, lastEdited = null, messageId = null, hasImage = false, imageData = null) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.user = user;
        this.isDefault = isDefault;
        this.editCount = editCount;
        this.lastEdited = lastEdited;
        this.messageId = messageId;
        this.hasImage = hasImage;
        this.imageData = imageData;
    }

    // Create a message element
    createElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (this.isDefault) {
            messageElement.style.fontStyle = 'italic';
        }
        if (this.messageId) {
            messageElement.setAttribute('data-message-id', this.messageId);
        }
        
        // Create a wrapper with flex layout for profile picture and text content
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper');

        // Always render profile picture (or fallback default)
        const profilePicElement = document.createElement('img');
        profilePicElement.classList.add('profile-pic');
        profilePicElement.alt = `${this.user && this.user.fullname ? this.user.fullname : "User"}'s profile picture`;
        if (this.user && this.user.profilepicurl) {
            profilePicElement.src = this.user.profilepicurl;
            profilePicElement.onerror = () => {
                console.error("Failed to load image:", this.user.profilepicurl);
                // Optionally assign a fallback local image if desired:
                profilePicElement.src = "../images/default-avatar.png";
            };
        } else {
            // Use a local default image instead of the ui-avatars.com fallback
            profilePicElement.src = "../images/default-avatar.png";
        }
        wrapper.appendChild(profilePicElement);

        // Create container for text content
        const textContainer = document.createElement('div');
        textContainer.classList.add('message-text');

        const headerElement = document.createElement('div');
        headerElement.classList.add('message-header');
        headerElement.innerHTML = `<strong>${this.sender}</strong> <span class="message-timestamp">${this.timestamp}</span>`;
        textContainer.appendChild(headerElement);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');

        // Handle image content
        if (this.hasImage && this.imageData) {
            // External GIF or image with direct URL (like Giphy)
            if (this.imageData.is_external && this.imageData.url) {
                const imgElement = document.createElement('img');
                imgElement.classList.add('message-image');
                
                // Check if it's a GIF based on URL or mime type
                const isGif = this.imageData.url.toLowerCase().endsWith('.gif') || 
                              (this.imageData.mime_type && this.imageData.mime_type.toLowerCase() === 'image/gif');
                
                if (isGif) {
                    imgElement.classList.add('message-gif');
                }
                
                // Use the direct URL
                imgElement.src = this.imageData.url;
                console.log("External image/GIF URL:", imgElement.src);
                
                // Set dimensions if available, with max constraints
                if (this.imageData.width && this.imageData.height) {
                    // Calculate aspect ratio to maintain proportions
                    const aspectRatio = this.imageData.width / this.imageData.height;
                    const maxWidth = 400; // Maximum width for images
                    
                    if (this.imageData.width > maxWidth) {
                        imgElement.style.width = maxWidth + 'px';
                        imgElement.style.height = (maxWidth / aspectRatio) + 'px';
                    } else {
                        imgElement.style.width = this.imageData.width + 'px';
                        imgElement.style.height = this.imageData.height + 'px';
                    }
                }
                
                imgElement.alt = this.imageData.title || 'Attached image';
                imgElement.title = this.imageData.title || '';
                
                // Handle image loading error
                imgElement.onerror = () => {
                    console.error("Failed to load external image:", imgElement.src);
                    imgElement.src = "../images/image-error.png"; // Fallback image
                    imgElement.alt = "Image failed to load";
                };
                
                contentElement.appendChild(imgElement);
                
                // Add image caption if there's also text content
                if (this.content && this.content.trim() !== '') {
                    const captionElement = document.createElement('div');
                    captionElement.classList.add('image-caption');
                    captionElement.textContent = this.content;
                    contentElement.appendChild(captionElement);
                }
            }
            // Local downloaded image with relative path
            else if (this.imageData.relative_path) {
                // Image message with downloaded image
                if (this.imageData.relative_path) {
                    const imgElement = document.createElement('img');
                    imgElement.classList.add('message-image');
                    
                    // Convert Windows path separators to URL format if needed
                    let relativePath = this.imageData.relative_path;
                    
                    // Get the bubble ID from current URL or other source
                    const bubbleID = currentChatID;
                    const sanitizedBubbleID = bubbleID ? bubbleID.replace(/[<>:"\/\\|?*]/g, '_') : '';
                    
                    // Create a path to the local image file
                    const appDataPath = '../../../appdata/chats/';
                    let bubblePath = '';
                    
                    // Handle different bubble location patterns
                    if (sanitizedBubbleID.includes('Clubs')) {
                        bubblePath = `bubbles/Clubs/${sanitizedBubbleID}`;
                    } else {
                        bubblePath = sanitizedBubbleID;
                    }
                    
                    imgElement.src = `${appDataPath}${bubblePath}/${relativePath}`;
                    console.log("Image path:", imgElement.src);
                    
                    // Set dimensions if available, with max constraints
                    if (this.imageData.width && this.imageData.height) {
                        // Calculate aspect ratio to maintain proportions
                        const aspectRatio = this.imageData.width / this.imageData.height;
                        const maxWidth = 400; // Maximum width for images
                        
                        if (this.imageData.width > maxWidth) {
                            imgElement.style.width = maxWidth + 'px';
                            imgElement.style.height = (maxWidth / aspectRatio) + 'px';
                        } else {
                            imgElement.style.width = this.imageData.width + 'px';
                            imgElement.style.height = this.imageData.height + 'px';
                        }
                    }
                    
                    imgElement.alt = this.imageData.title || 'Attached image';
                    imgElement.title = this.imageData.title || '';
                    
                    // Handle image loading error
                    imgElement.onerror = () => {
                        console.error("Failed to load message image:", imgElement.src);
                        // Try alternative path formats
                        if (!imgElement.src.includes('/bubbles/')) {
                            imgElement.src = `${appDataPath}bubbles/${sanitizedBubbleID}/${relativePath}`;
                            console.log("Trying alternative path:", imgElement.src);
                        } else {
                            imgElement.src = "../images/image-error.png"; // Fallback image
                            imgElement.alt = "Image failed to load";
                        }
                    };
                    
                    contentElement.appendChild(imgElement);
                    
                    // Add image caption if there's also text content
                    if (this.content && this.content.trim() !== '') {
                        const captionElement = document.createElement('div');
                        captionElement.classList.add('image-caption');
                        captionElement.textContent = this.content;
                        contentElement.appendChild(captionElement);
                    }
                } else {
                    // Fallback if local image is not available
                    const imageInfoElement = document.createElement('div');
                    imageInfoElement.classList.add('image-info');
                    imageInfoElement.innerHTML = `<i class="fas fa-image"></i> Image: ${this.imageData.title || 'Attached image'}`;
                    contentElement.appendChild(imageInfoElement);
                    
                    // Add text content if available
                    if (this.content && this.content.trim() !== '') {
                        contentElement.appendChild(document.createElement('br'));
                        contentElement.appendChild(document.createTextNode(this.content));
                    }
                }
            } else {
                // Fallback for images without local path or external URL
                const imageInfoElement = document.createElement('div');
                imageInfoElement.classList.add('image-info');
                imageInfoElement.innerHTML = `<i class="fas fa-image"></i> Image attachment`;
                contentElement.appendChild(imageInfoElement);
                
                // Add text content if available
                if (this.content && this.content.trim() !== '') {
                    contentElement.appendChild(document.createElement('br'));
                    contentElement.appendChild(document.createTextNode(this.content));
                }
            }
        } else if (this.hasImage) {
            // Generic image placeholder if we know there's an image but don't have details
            const imageInfoElement = document.createElement('div');
            imageInfoElement.classList.add('image-info');
            imageInfoElement.innerHTML = `<i class="fas fa-image"></i> Image attachment`;
            contentElement.appendChild(imageInfoElement);
            
            // Add text content if available
            if (this.content && this.content.trim() !== '') {
                contentElement.appendChild(document.createElement('br'));
                contentElement.appendChild(document.createTextNode(this.content));
            }
        } else {
            // Regular text message
            contentElement.textContent = this.content;
        }

        textContainer.appendChild(contentElement);
        wrapper.appendChild(textContainer);
        messageElement.appendChild(wrapper);

        // Add edit info if the message has been edited
        if (this.editCount > 0) {
            const editInfoElement = document.createElement('div');
            editInfoElement.classList.add('edit-info');
            editInfoElement.innerHTML = `<i class="fa fa-pencil"></i> x${this.editCount}`;
            if (this.lastEdited) {
                editInfoElement.title = `Last edited: ${this.lastEdited}`;
            }
            messageElement.appendChild(editInfoElement);
        }

        /* Add delete icon if permission is granted */
        if (hasDeletePermission) {
            const deleteIcon = document.createElement('i');
            deleteIcon.classList.add('fas', 'fa-trash', 'delete-icon');
            deleteIcon.title = 'Delete Message';
            // Add event listener for deletion if needed
            deleteIcon.addEventListener('click', async (event) => {
                event.stopPropagation(); /* Prevent triggering message click */
                if (this.messageId) {
                    if (confirm('Are you sure you want to delete this message?')) {
                        try {
                            const response = await window.pywebview.api.delete_message(this.messageId);
                            if (response && response.ok) {
                                messageElement.remove();
                            } else {
                                // Create and show error message
                                const errorDiv = document.createElement('div');
                                errorDiv.classList.add('error-popup');
                                errorDiv.textContent = response.error === 'MESSAGE_ACCESSDENIED' ? 
                                    'You do not have permission to delete this message.' : 
                                    'Failed to delete message.';
                                
                                messageElement.appendChild(errorDiv);
                                
                                // Remove error message after 3 seconds
                                setTimeout(() => {
                                    errorDiv.remove();
                                }, 3000);
                                
                                console.error('Failed to delete message:', response);
                            }
                        } catch (error) {
                            console.error('Error deleting message:', error);
                        }
                    }
                } else {
                    console.error('No message ID available for deletion');
                }
            });
            messageElement.appendChild(deleteIcon); /* Ensure deleteIcon is inside messageElement */

            // Change color on hover if Shift key is pressed
            messageElement.addEventListener('mouseover', () => {
                if (isShiftPressed) {
                    deleteIcon.style.color = 'red';
                }
            });

            messageElement.addEventListener('mouseout', () => {
                deleteIcon.style.color = ''; // Reset color
            });
        }

        return messageElement;
    }
}

// Function to show loading animation and hide screen contents
function showLoading() {
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
function hideLoading() {
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

// Function to retrieve and display detailed messages for a specific bubble ID
async function loadMessages(bubbleID, bubbleName) {
    // Removed showLoading() call so that hamster animation is not shown when loading messages
    try {
        console.log(`Loading local messages for bubble ID: ${bubbleID}`); // Debug statement
        const localResponse = await window.pywebview.api.get_Localmessages(bubbleID);
        console.log('Local response retrieved:', localResponse); // Debug statement

        if (!localResponse || typeof localResponse !== 'object' || !Array.isArray(localResponse.messages)) {
            console.error("Invalid local response format received:", localResponse);
            return;
        }

        const localMessages = localResponse.messages.reverse(); // Reverse the order of the messages
        messagesContainer.innerHTML = ''; // Clear existing messages

        if (localMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            localMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing local message:', msg);
                const content = msg.message || msg.content;
                const author = msg.author;
                const timestamp = msg.time_of_sending;
                const user = { fullname: msg.author, profilepicurl: msg.profilepicurl };

                if (content && author && timestamp) {
                    const message = new Message(content, author, timestamp, user, false, msg.edit_count, msg.last_edited);
                    messagesContainer.appendChild(message.createElement()); // Display message in HTML
                } else {
                    console.warn('Incomplete local message data:', msg);
                }
            });
        }

        // Clear messagesContainer before adding dynamic messages to avoid duplication
        messagesContainer.innerHTML = '';
        console.log(`Loading dynamic messages for bubble ID: ${bubbleID}`); // Debug statement
        const dynamicResponse = await window.pywebview.api.get_dynamicdetailed_messages(bubbleID);
        console.log('Dynamic response retrieved:', dynamicResponse); // Debug statement

        if (!dynamicResponse || typeof dynamicResponse !== 'object' || !Array.isArray(dynamicResponse.messages)) {
            console.error("Invalid dynamic response format received:", dynamicResponse);
            return;
        }

        const dynamicMessages = dynamicResponse.messages.reverse(); // Reverse the order of the messages

        if (dynamicMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            dynamicMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing dynamic message:', msg);
                const content = msg.message || msg.content || '';
                const author = msg.author || 'Unknown';
                const timestamp = msg.time_of_sending || new Date().toISOString();
                const user = { 
                    fullname: msg.author || 'Unknown', 
                    profilepicurl: msg.profilepicurl 
                };
                const messageId = msg.message_id;
                const hasImage = msg.has_image || false;
                const imageData = msg.image_data || null;

                const message = new Message(
                    content, 
                    author, 
                    timestamp, 
                    user, 
                    false, 
                    msg.edit_count, 
                    msg.last_edited,
                    messageId,
                    hasImage,
                    imageData
                );
                messagesContainer.appendChild(message.createElement()); // Display message in HTML
            });
        }

        // Debug logging for image paths
        dynamicMessages.forEach(msg => {
            if (msg.has_image && msg.image_data) {
                console.log("Message has image data:", msg.image_data);
                if (msg.image_data.is_external) {
                    console.log("External media URL:", msg.image_data.url);
                }
            }
            if (msg.media && msg.media.length > 0) {
                console.log("Message has media:", msg.media);
                
                // Look for GIFs in media
                const gifMedia = msg.media.filter(m => 
                    (m.url && m.url.toLowerCase().includes('.gif')) ||
                    (m.urlmimetype && m.urlmimetype.toLowerCase() === 'image/gif')
                );
                
                if (gifMedia.length > 0) {
                    console.log("Found GIF media:", gifMedia);
                }
            }
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        setChatHeading(bubbleName); // Update chat heading with the bubble name
    } catch (error) {
        console.error("Error loading messages:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
    // Removed hideLoading() call so that the hamster animation is only handled by bubble loading functions
}

// Function to initialize categories and chats dynamically from backend
async function initializeCategories() {
    showLoading(); // Show loading animation
    try {
        console.log("Initializing categories and chats"); // New debug statement

        const categories = await window.pywebview.api.get_Localcategories();
        const dms = await window.pywebview.api.get_Localdms();
        const categorizedBubbles = await window.pywebview.api.get_Localcategorized_bubbles();
        const uncategorizedBubbles = await window.pywebview.api.get_Localuncategorized_bubbles();
        const unreadBubbles = await window.pywebview.api.get_Localunread_bubbles();

        const unreadMap = {};
        unreadBubbles.forEach(item => {
            unreadMap[item.title] = item.unread;
        });

        // Combine all bubbles from DM, categorized and uncategorized for lookup.
        let allBubbles = [];
        if (Array.isArray(dms)) {
            allBubbles = allBubbles.concat(dms);
        }
        if (categorizedBubbles && typeof categorizedBubbles === 'object') {
            Object.values(categorizedBubbles).forEach(chats => {
                allBubbles = allBubbles.concat(chats);
            });
        }
        if (Array.isArray(uncategorizedBubbles)) {
            allBubbles = allBubbles.concat(uncategorizedBubbles);
        }

        // Process unread bubbles: if bubble.id is undefined, try to find it in allBubbles based on title.
        const processedUnreadBubbles = unreadBubbles.map(bubble => {
            if (!bubble.id) {
                const match = allBubbles.find(b => b.title === bubble.title);
                if (match && match.id) {
                    bubble.id = match.id;
                } else {
                    console.warn(`No matching bubble found for title: ${bubble.title}`);
                    // Optionally disable click functionality later by setting bubble.id to empty string.
                    bubble.id = "";
                }
            }
            return bubble;
        });

        const categoryElements = [];

        // Add unread bubbles as a separate category at the top
        if (processedUnreadBubbles.length > 0) {
            categoryElements.push(new Category('Unread', processedUnreadBubbles, unreadMap));
        }

        // Add DM category
        if (dms.length > 0) {
            categoryElements.push(new Category('Direct Messages', dms, unreadMap, true));
        }

        // Add categorized bubbles
        for (const [categoryName, chats] of Object.entries(categorizedBubbles)) {
            categoryElements.push(new Category(categoryName, chats, unreadMap));
        }

        // Add uncategorized bubbles
        if (uncategorizedBubbles.length > 0) {
            categoryElements.push(new Category('Uncategorized', uncategorizedBubbles, unreadMap));
        }

        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = ''; // Clear existing content
        categoryElements.forEach(category => {
            const categoryElement = category.createElement();
            if (categoryElement) {
                chatList.appendChild(categoryElement);
            } else {
                console.warn('Failed to create category element:', category.name);
            }
        });

        // Add event listeners for category headers and menu buttons
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isExpanded = content.classList.contains('expanded');

                // Toggle the 'expanded' and 'collapsed' classes
                content.classList.toggle('expanded');
                content.classList.toggle('collapsed');

                // Toggle the arrow direction
                header.classList.toggle('collapsed', isExpanded);
            });
        });

        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const dropdown = button.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        });

        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });

        // Update unread counts visibility after rendering
        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error); // Existing debug statement
    } finally {
        hideLoading(); // Hide loading animation
    }
}

// Category class to create category elements
class Category {
    constructor(name, chats, unreadCounts = {}, isDM = false) {
        this.name = name;
        this.chats = chats;
        this.unreadCounts = unreadCounts;
        this.isDM = isDM;
    }

    // Create a category element
    createElement() {
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category');

        const headerElement = document.createElement('div');
        headerElement.classList.add('category-header');
        headerElement.textContent = this.name;

        const contentElement = document.createElement('div');
        contentElement.classList.add('category-content', 'expanded');

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.setAttribute('data-chat-id', chat.id); // Ensure chat.id is correctly set
            chatItem.setAttribute('data-has-unread-mentions', chat.hasUnreadMentions); // Set the data-has-unread-mentions attribute
            chatItem.setAttribute('data-is-dm', this.isDM || chat.isDM); // Set the data-is-dm attribute
            chatItem.innerHTML = `
                <span class="chat-title">${chat.title}</span>
                <span class="unread-count">${this.unreadCounts[chat.title] || 0}</span>
                <button class="menu-button">⋮</button>
                <ul class="dropdown-menu">
                    ${this.createDropdownOptions(['Mark as Read', 'Option 1', 'Option 2', 'Option 3', 'Option 4'])}
                </ul>
            `;
            // Add event listener to call Python function and load messages when clicked
            chatItem.addEventListener('click', async () => {
                const chatID = chatItem.getAttribute('data-chat-id');
                if (chatID) {
                    window.pywebview.api.print_chat_info(chat.title, chatID);
                    currentChatID = chatID; // Update the current chat ID
                    console.log(chatID);
                    
                    // Load messages for the clicked chat and update heading
                    loadMessages(chatID, chat.title);
                    
                } else {
                    console.error('Chat ID is undefined');
                }
            });
            contentElement.appendChild(chatItem);
        });

        categoryElement.appendChild(headerElement);
        categoryElement.appendChild(contentElement);

        return categoryElement;
    }

    // Create dropdown options
    createDropdownOptions(options) {
        return options.map(option => `<li>${option}</li>`).join('');
    }
}

// Function to wait for pywebview API to be ready
function waitForPywebview() {
    if (window.pywebview && window.pywebview.api) {
        initializeLiveBubbles();
    } else {
        setTimeout(waitForPywebview, 100); // Check again after 100ms
    }
}

// Function to initialize live bubbles and then categories
async function initializeLiveBubbles() {
    try {
        console.log("Fetching live bubbles"); // Debug statement
        await window.pywebview.api.get_live_bubbles();
        initializeCategories(); // Call initializeCategories after fetching live bubbles
    } catch (error) {
        console.error("Error fetching live bubbles:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
}

// Display a default message when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    console.log('chat.html DOMContentLoaded');  // Debugging statement

    waitForPywebview(); // Wait for pywebview API to be ready

    // const accessTokenResponse = await window.pywebview.api.accessToken();
    // console.log('Access token response:', accessTokenResponse);
});

// Update the message input event listener to handle the response
messageInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {  // Allow Shift+Enter for new lines
        event.preventDefault(); // Prevent default Enter key behavior
        const messageText = messageInput.value.trim();
        if (messageText && currentChatID) {
            try {
                // Send message to backend
                const response = await window.pywebview.api.send_message(currentChatID, messageText, await window.pywebview.api.get_user_id(), null);
                if (response && response.ok && response.message) {
                    // Create message from response data
                    const messageData = response.message;
                    const message = new Message(
                        messageData.message,
                        messageData.user.fullname,
                        messageData.created_at,
                        messageData.user,
                        false,
                        messageData.user_edited_version,
                        messageData.user_edited_at,
                        messageData.id
                    );
                    
                    // Create and append the message element
                    const messageElement = message.createElement();
                    messageElement.classList.add('message-new'); // Add animation class
                    messagesContainer.appendChild(messageElement);
                    messageInput.value = ''; // Clear the input after sending
                    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
                }
            } catch (error) {
                console.error("Error sending message:", error);
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

// Remove any event listeners that might prevent text selection
document.addEventListener('mousedown', (event) => {
    // Do not call event.preventDefault()
});

document.querySelectorAll('.dropdown-menu li').forEach(option => {
    option.addEventListener('click', async (event) => {
        const optionText = event.target.textContent;
        const chatItem = event.target.closest('.chat-item');
        const chatID = chatItem.getAttribute('data-chat-id');
        if (optionText === 'Mark as Read' && chatID) {
            try {
                await window.pywebview.api.markBubbleAsRead(chatID);
                chatItem.querySelector('.unread-count').textContent = '0';
                updateUnreadCounts();
            } catch (error) {
                console.error('Error marking bubble as read:', error);
            }
        }
    });
});

searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-item');
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

// Add highlight function to highlight matching text
function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Add CSS class for message animations
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
