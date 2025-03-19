import { isShiftPressed } from './constants.js';

// Message class to create message elements
export class Message {
    constructor(content, sender, timestamp, user, isDefault = false, editCount = 0, lastEdited = null, messageId = null) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.user = user;
        this.isDefault = isDefault;
        this.editCount = editCount;
        this.lastEdited = lastEdited;
        this.messageId = messageId;
    }

    // Format timestamp in Discord style (Today at 2:30 PM or MM/DD/YYYY)
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return timestamp;
        
        // Create a new date object to ensure we're working with local time
        const now = new Date();
        
        // Check if the date is today by comparing year, month, and day
        const isToday = date.getFullYear() === now.getFullYear() && 
                        date.getMonth() === now.getMonth() && 
                        date.getDate() === now.getDate();
        
        // Check if the date is yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.getFullYear() === yesterday.getFullYear() && 
                            date.getMonth() === yesterday.getMonth() && 
                            date.getDate() === yesterday.getDate();
        
        // Format the time part using local timezone settings
        const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
        const time = date.toLocaleTimeString([], timeOptions);
        
        if (isToday) return `Today at ${time}`;
        if (isYesterday) return `Yesterday at ${time}`;
        
        // For older dates, include the date with the local timezone
        const dateOptions = { month: 'numeric', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString([], dateOptions)} ${time}`;
    }

    // Create a message element
    createElement() {
        const messageGroup = document.createElement('div');
        messageGroup.classList.add('message-group');
        messageGroup.setAttribute('data-author-id', this.user?.id || this.sender);
        
        if (this.messageId) messageGroup.setAttribute('data-message-id', this.messageId);
        if (this.isDefault) messageGroup.classList.add('system-message');
        
        messageGroup.appendChild(this._createAvatar());
        messageGroup.appendChild(this._createMessageContent());
        
        return messageGroup;
    }
    
    _createAvatar() {
        const avatarContainer = document.createElement('div');
        avatarContainer.classList.add('avatar-container');
        
        const profilePicture = document.createElement('img');
        profilePicture.classList.add('profile-pic');
        profilePicture.alt = `${this.user?.fullname || this.sender}'s profile picture`;
        profilePicture.src = this.user?.profilepicurl || "../images/default-avatar.png";
        profilePicture.onerror = () => profilePicture.src = "../images/default-avatar.png";
        
        avatarContainer.appendChild(profilePicture);
        return avatarContainer;
    }
    
    _createMessageContent() {
        const contentGroup = document.createElement('div');
        contentGroup.classList.add('message-content-group');
        
        contentGroup.appendChild(this._createHeader());
        contentGroup.appendChild(this._createMessageBody());
        
        return contentGroup;
    }
    
    _createHeader() {
        const header = document.createElement('div');
        header.classList.add('sender-header');
        
        const senderName = document.createElement('span');
        senderName.classList.add('message-sender');
        senderName.textContent = this.sender;
        header.appendChild(senderName);
        
        const timestamp = document.createElement('span');
        timestamp.classList.add('message-timestamp');
        timestamp.textContent = this.formatTimestamp(this.timestamp);
        timestamp.title = new Date(this.timestamp).toLocaleString();
        header.appendChild(timestamp);
        
        if (this.editCount > 0) {
            const editInfo = document.createElement('span');
            editInfo.classList.add('edit-info');
            editInfo.innerHTML = `<i class="fa fa-pencil"></i>`;
            editInfo.title = `Edited ${this.editCount} time${this.editCount > 1 ? 's' : ''}`;
            if (this.lastEdited) {
                editInfo.title += ` • Last edited: ${this.formatTimestamp(this.lastEdited)}`;
            }
            header.appendChild(editInfo);
        }
        
        return header;
    }
    
    // Parse URLs in text and convert them to clickable links
    _parseUrls(text) {
        if (!text) return '';
        
        // Regex to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        // Replace URLs with anchor tags
        return text.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }
    
    _createMessageBody() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper');
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        
        if (this.content && this.content.trim() !== '') {
            // Parse URLs in content
            contentElement.innerHTML = this._parseUrls(this.content);
        }
        
        wrapper.appendChild(contentElement);
        messageElement.appendChild(wrapper);
        messageElement.appendChild(this._createActions());
        
        return messageElement;
    }
    
    _createActions() {
        const actions = document.createElement('div');
        actions.classList.add('message-actions');
        
        const deleteBtn = document.createElement('div');
        deleteBtn.classList.add('message-action-btn', 'delete');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete Message (Hold Shift for quick delete)';
        
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!this.messageId) {
                console.error('No message ID available for deletion');
                return;
            }
            
            // Get quick delete setting from localStorage
            let useQuickDelete = false;
            try {
                const settings = JSON.parse(localStorage.getItem('chatSettings'));
                useQuickDelete = settings && settings.quickDelete === true;
            } catch (e) {
                console.error('Error parsing settings:', e);
            }
            
            // Delete immediately if shift is pressed or quick delete is enabled in settings
            if (event.shiftKey || useQuickDelete) {
                this._deleteMessage(event.target.closest('.message-group'));
            } else {
                this._showDeleteConfirmation(event.target.closest('.message-group'));
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                deleteBtn.classList.add('shift-active');
                deleteBtn.title = 'Quick delete message (without confirmation)';
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                deleteBtn.classList.remove('shift-active');
                deleteBtn.title = 'Delete Message (Hold Shift for quick delete)';
            }
        });
        
        actions.appendChild(deleteBtn);
        return actions;
    }

    // Show custom delete confirmation
    _showDeleteConfirmation(messageGroup) {
        let modal = document.getElementById('delete-confirmation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'delete-confirmation-modal';
            modal.className = 'delete-confirmation-modal';
            
            modal.innerHTML = `
                <div class="delete-confirmation-content">
                    <h3>Delete Message</h3>
                    <p>Are you sure you want to delete this message?</p>
                    <div class="delete-confirmation-buttons">
                        <button class="delete-confirmation-btn cancel">Cancel</button>
                        <button class="delete-confirmation-btn delete">Delete</button>
                    </div>
                    <div class="delete-confirmation-tip">Tip: Hold Shift while clicking delete for quick deletion or enable Quick Delete in Settings</div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
            
            modal.querySelector('.cancel').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        modal.querySelector('.delete').onclick = () => {
            this._deleteMessage(messageGroup);
            modal.classList.remove('active');
        };
        
        modal.classList.add('active');
    }
    
    // Handle message deletion
    async _deleteMessage(messageGroup) {
        try {
            const response = await window.pywebview.api.delete_message(this.messageId);
            if (response?.ok) {
                messageGroup.style.transition = 'opacity 0.3s ease';
                messageGroup.style.opacity = '0';
                
                Toast.show('Message deleted successfully', 'success');
                setTimeout(() => messageGroup.remove(), 300);
            } else {
                const errorMessage = response?.error === 'MESSAGE_ACCESSDENIED' 
                    ? 'You do not have permission to delete this message' 
                    : (response?.error || 'Failed to delete message');
                
                Toast.show(errorMessage, 'error');
                console.error('Failed to delete message:', response);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            Toast.show('Error connecting to server', 'error');
        }
    }
}

// Toast notification class
class Toast {
    static show(message, type = 'success', duration = 5000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const iconClass = type === 'error' ? 'fa-times' : 
                          type === 'warning' ? 'fa-exclamation-triangle' : 
                          type === 'info' ? 'fa-info-circle' : 'fa-check';
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon"><i class="fas ${iconClass}"></i></div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
            <div class="toast-progress"></div>
        `;
        
        container.appendChild(toast);
        
        const progressBar = toast.querySelector('.toast-progress');
        progressBar.style.width = '100%';
        progressBar.style.transitionDuration = `${duration}ms`;
        
        const dismissToast = () => {
            toast.classList.add('fade-out');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => progressBar.style.width = '0%', 10);
        }, 10);
        
        let dismissTimeout = setTimeout(dismissToast, duration);
        toast.querySelector('.toast-close').addEventListener('click', dismissToast);
        
        toast.addEventListener('mouseenter', () => {
            progressBar.style.transitionProperty = 'none';
            clearTimeout(dismissTimeout);
        });
        
        toast.addEventListener('mouseleave', () => {
            const remainingPercentage = parseFloat(getComputedStyle(progressBar).width) / 
                                       parseFloat(getComputedStyle(toast).width);
            const remainingTime = duration * remainingPercentage;
            progressBar.style.transitionProperty = 'width';
            progressBar.style.transitionDuration = `${remainingTime}ms`;
            dismissTimeout = setTimeout(dismissToast, remainingTime);
            setTimeout(() => progressBar.style.width = '0%', 10);
        });
    }
}
