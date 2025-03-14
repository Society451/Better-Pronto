import { Category } from './category.js';
import { showLoading, hideLoading, updateUnreadCounts } from './ui.js';

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

        // Update unread counts visibility after rendering
        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error);
    } finally {
        hideLoading(); // Hide loading animation
    }
}
