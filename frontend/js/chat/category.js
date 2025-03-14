import { setCurrentChatID } from './constants.js';
import { setChatHeading } from './ui.js';
import { loadMessages } from './messages.js';

// Category class to create category elements
export class Category {
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
                    setCurrentChatID(chatID); // Update the current chat ID
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
