import { setCurrentChatID } from './constants.js';
import { setChatHeading, showLoading, hideLoading, updateUnreadCounts } from './ui.js';
import { loadMessages } from './MessageManager.js';

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
            chatItem.setAttribute('data-chat-id', chat.id);
            chatItem.setAttribute('data-has-unread-mentions', chat.hasUnreadMentions);
            chatItem.setAttribute('data-is-dm', this.isDM || chat.isDM);
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
                    // Remove 'active' class from all chat items
                    document.querySelectorAll('.chat-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    // Add 'active' class to the clicked chat item
                    chatItem.classList.add('active');
                    
                    window.pywebview.api.print_chat_info(chat.title, chatID);
                    setCurrentChatID(chatID); // Update the current chat ID
                    
                    // Make chat heading and input visible
                    document.querySelector('.chat-heading').style.display = 'block';
                    document.querySelector('.input-group').style.display = 'flex';
                    
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

// Function to initialize categories and chats dynamically from backend
export async function initializeCategories() {
    showLoading(); // Show loading animation
    try {
        console.log("Initializing categories and chats");

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
            const unreadCategory = new Category('Unread', processedUnreadBubbles, unreadMap);
            categoryElements.push(unreadCategory);
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
                // Add a data attribute for easier category identification
                if (category.name === 'Unread') {
                    categoryElement.setAttribute('data-category', 'unread');
                }
                chatList.appendChild(categoryElement);
            } else {
                console.warn('Failed to create category element:', category.name);
            }
        });

        // Update unread counts visibility after rendering
        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error);
    } finally {
        hideLoading(); // Hide loading animation
    }
}
