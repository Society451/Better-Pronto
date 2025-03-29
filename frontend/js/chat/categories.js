import { setCurrentChatID } from './constants.js';
import { setChatHeading, showLoading, hideLoading, updateUnreadCounts } from './ui.js';
import { loadMessages } from './MessageManager.js';

class Category {
    constructor(name, chats, unreadCounts = {}, isDM = false) {
        this.name = name;
        this.chats = chats;
        this.unreadCounts = unreadCounts;
        this.isDM = isDM;
    }

    createElement() {
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category');

        const headerElement = document.createElement('div');
        headerElement.classList.add('category-header');
        headerElement.textContent = this.name;

        const contentElement = document.createElement('div');
        contentElement.classList.add('category-content', 'expanded');

        this.chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            contentElement.appendChild(chatItem);
        });

        categoryElement.appendChild(headerElement);
        categoryElement.appendChild(contentElement);
        return categoryElement;
    }

    createChatItem(chat) {
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
        
        chatItem.addEventListener('click', () => this.handleChatItemClick(chatItem, chat));
        return chatItem;
    }

    async handleChatItemClick(chatItem, chat) {
        const chatID = chatItem.getAttribute('data-chat-id');
        if (!chatID) {
            console.error('Chat ID is undefined');
            return;
        }

        // Update UI state
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        chatItem.classList.add('active');
        
        // Set current chat and make chat interface visible
        window.pywebview.api.print_chat_info(chat.title, chatID);
        setCurrentChatID(chatID);
        document.querySelector('.chat-heading').style.display = 'block';
        document.querySelector('.input-group').style.display = 'flex';
        
        // Mark as read and handle UI updates
        this.markChatAsRead(chatID);
        
        // Load messages for the clicked chat
        loadMessages(chatID, chat.title);
    }

    markChatAsRead(chatID) {
        try {
            const unreadCategory = Array.from(document.querySelectorAll('.category')).find(
                cat => cat.querySelector('.category-header').textContent === 'Unread'
            );
            
            window.pywebview.api.markBubbleAsRead(chatID)
                .then(() => {
                    // Update unread count to zero in all instances of this chat
                    document.querySelectorAll(`.chat-item[data-chat-id="${chatID}"] .unread-count`)
                        .forEach(count => count.textContent = '0');
                    
                    updateUnreadCounts();
                    
                    if (!unreadCategory) return;
                    
                    const unreadChatItem = Array.from(unreadCategory.querySelectorAll('.chat-item'))
                        .find(item => item.getAttribute('data-chat-id') === chatID);
                    
                    if (unreadChatItem) {
                        this.removeUnreadChat(unreadChatItem, unreadCategory);
                    }
                })
                .catch(error => console.error('Error marking bubble as read:', error));
        } catch (error) {
            console.error('Error in mark as read process:', error);
        }
    }

    removeUnreadChat(chatItem, unreadCategory) {
        chatItem.classList.add('fade-out');
        
        setTimeout(() => {
            chatItem.remove();
            
            const remainingItems = unreadCategory.querySelectorAll('.category-content .chat-item');
            if (remainingItems.length === 0) {
                unreadCategory.classList.add('empty');
                
                setTimeout(() => {
                    unreadCategory.classList.add('fade-out');
                    setTimeout(() => unreadCategory.remove(), 500);
                }, 200);
            }
        }, 500);
    }

    createDropdownOptions(options) {
        return options.map(option => `<li>${option}</li>`).join('');
    }
}

export async function initializeCategories() {
    showLoading();
    try {
        console.log("Initializing categories and chats");

        // Fetch data from backend
        const [categories, dms, categorizedBubbles, uncategorizedBubbles, unreadBubbles] = await Promise.all([
            window.pywebview.api.get_Localcategories(),
            window.pywebview.api.get_Localdms(),
            window.pywebview.api.get_Localcategorized_bubbles(),
            window.pywebview.api.get_Localuncategorized_bubbles(),
            window.pywebview.api.get_Localunread_bubbles()
        ]);

        // Create unread counts map
        const unreadMap = Object.fromEntries(unreadBubbles.map(item => [item.title, item.unread]));

        // Combine all bubbles for lookup
        const allBubbles = [
            ...(Array.isArray(dms) ? dms : []),
            ...(categorizedBubbles ? Object.values(categorizedBubbles).flat() : []),
            ...(Array.isArray(uncategorizedBubbles) ? uncategorizedBubbles : [])
        ];

        // Process unread bubbles to find missing IDs
        const processedUnreadBubbles = unreadBubbles.map(bubble => {
            if (!bubble.id) {
                const match = allBubbles.find(b => b.title === bubble.title);
                bubble.id = match?.id || "";
                if (!bubble.id) console.warn(`No matching bubble found for title: ${bubble.title}`);
            }
            return bubble;
        });

        // Create category elements
        const categoryElements = [];

        // Add categories in order: Unread, DMs, Categorized, Uncategorized
        if (processedUnreadBubbles.length > 0) {
            categoryElements.push(new Category('Unread', processedUnreadBubbles, unreadMap));
        }

        if (dms.length > 0) {
            categoryElements.push(new Category('Direct Messages', dms, unreadMap, true));
        }

        for (const [categoryName, chats] of Object.entries(categorizedBubbles)) {
            categoryElements.push(new Category(categoryName, chats, unreadMap));
        }

        if (uncategorizedBubbles.length > 0) {
            categoryElements.push(new Category('Uncategorized', uncategorizedBubbles, unreadMap));
        }

        // Render categories to DOM
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        
        categoryElements.forEach(category => {
            const element = category.createElement();
            if (element) {
                if (category.name === 'Unread') element.setAttribute('data-category', 'unread');
                chatList.appendChild(element);
            } else {
                console.warn('Failed to create category element:', category.name);
            }
        });

        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error);
    } finally {
        hideLoading();
    }
}
