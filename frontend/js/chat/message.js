import { isShiftPressed } from './constants.js';

// Message class to create message elements
export class Message {
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

    // Format timestamp in Discord style (Today at 2:30 PM or MM/DD/YYYY)
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return timestamp; // Return original if invalid date
        }
        
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
        
        const timeOptions = { hour: 'numeric', minute: 'numeric' };
        const formattedTime = date.toLocaleTimeString([], timeOptions);
        
        if (isToday) {
            return `Today at ${formattedTime}`;
        } else if (isYesterday) {
            return `Yesterday at ${formattedTime}`;
        } else {
            return `${date.toLocaleDateString()} ${formattedTime}`;
        }
    }

    // Create a message element
    createElement() {
        // Create the main message group container
        const messageGroup = document.createElement('div');
        messageGroup.classList.add('message-group');
        
        // Add data attributes for grouping
        messageGroup.setAttribute('data-author-id', this.user?.id || this.sender);
        if (this.messageId) {
            messageGroup.setAttribute('data-message-id', this.messageId);
        }
        if (this.isDefault) {
            messageGroup.classList.add('system-message');
        }
        
        // Create avatar container and profile picture
        const avatarContainer = document.createElement('div');
        avatarContainer.classList.add('avatar-container');
        
        const profilePicElement = document.createElement('img');
        profilePicElement.classList.add('profile-pic');
        profilePicElement.alt = `${this.user?.fullname || this.sender}'s profile picture`;
        
        if (this.user?.profilepicurl) {
            profilePicElement.src = this.user.profilepicurl;
            profilePicElement.onerror = () => {
                console.error("Failed to load image:", this.user.profilepicurl);
                profilePicElement.src = "../images/default-avatar.png";
            };
        } else {
            profilePicElement.src = "../images/default-avatar.png";
        }
        
        avatarContainer.appendChild(profilePicElement);
        messageGroup.appendChild(avatarContainer);
        
        // Create the message content group container
        const messageContentGroup = document.createElement('div');
        messageContentGroup.classList.add('message-content-group');
        
        // Create sender header with name and timestamp
        const senderHeader = document.createElement('div');
        senderHeader.classList.add('sender-header');
        
        const senderName = document.createElement('span');
        senderName.classList.add('message-sender');
        senderName.textContent = this.sender;
        senderHeader.appendChild(senderName);
        
        const timestamp = document.createElement('span');
        timestamp.classList.add('message-timestamp');
        timestamp.textContent = this.formatTimestamp(this.timestamp);
        timestamp.title = new Date(this.timestamp).toLocaleString();
        senderHeader.appendChild(timestamp);
        
        // Add edit indicator to the header if message was edited
        if (this.editCount > 0) {
            const editInfo = document.createElement('span');
            editInfo.classList.add('edit-info');
            editInfo.innerHTML = `<i class="fa fa-pencil"></i>`;
            editInfo.title = `Edited ${this.editCount} time${this.editCount > 1 ? 's' : ''}`;
            if (this.lastEdited) {
                editInfo.title += ` • Last edited: ${this.formatTimestamp(this.lastEdited)}`;
            }
            senderHeader.appendChild(editInfo);
        }
        
        messageContentGroup.appendChild(senderHeader);
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        // Create wrapper for message content
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');
        
        // Create content element
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        
        // Add content based on type
        if (this.hasImage && this.imageData) {
            this._addImageContent(contentElement);
        } else if (this.hasImage) {
            this._addImagePlaceholder(contentElement);
        } else if (this.content && this.content.trim() !== '') {
            contentElement.textContent = this.content;
        }
        
        messageWrapper.appendChild(contentElement);
        messageElement.appendChild(messageWrapper);
        messageContentGroup.appendChild(messageElement);
        
        // Add action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('message-actions');
        
        // Add delete button to actions
        if (true) { // Using true instead of hasDeletePermission
            const deleteBtn = document.createElement('div');
            deleteBtn.classList.add('message-action-btn', 'delete');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Message (Hold Shift for quick delete)';
            
            // Update the delete button to check for Shift key
            deleteBtn.addEventListener('click', async (event) => {
                event.stopPropagation();
                if (this.messageId) {
                    // Check if shift key is pressed for quick delete
                    if (event.shiftKey) {
                        this._deleteMessage(messageGroup);
                    } else {
                        // Show the custom confirmation modal
                        this._showDeleteConfirmation(messageGroup);
                    }
                } else {
                    console.error('No message ID available for deletion');
                }
            });
            
            actionsContainer.appendChild(deleteBtn);
            
            // Add event listeners to update delete button appearance when shift is pressed
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
        }
        
        messageElement.appendChild(actionsContainer);
        messageGroup.appendChild(messageContentGroup);
        
        return messageGroup;
    }

    // Add a new method to show custom delete confirmation
    _showDeleteConfirmation(messageGroup) {
        // Create modal container if it doesn't exist yet
        let modal = document.getElementById('delete-confirmation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'delete-confirmation-modal';
            modal.className = 'delete-confirmation-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'delete-confirmation-content';
            
            modalContent.innerHTML = `
                <h3>Delete Message</h3>
                <p>Are you sure you want to delete this message?</p>
                <div class="delete-confirmation-buttons">
                    <button class="delete-confirmation-btn cancel">Cancel</button>
                    <button class="delete-confirmation-btn delete">Delete</button>
                </div>
                <div class="delete-confirmation-tip">Tip: Hold Shift while clicking delete for quick deletion</div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close modal when clicking outside of it
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
            
            // Set up cancel button
            modal.querySelector('.cancel').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        // Update delete button action for this specific message
        const deleteButton = modal.querySelector('.delete');
        deleteButton.onclick = () => {
            this._deleteMessage(messageGroup);
            modal.classList.remove('active');
        };
        
        // Show the modal
        modal.classList.add('active');
    }
    
    // Add a method to handle the actual message deletion
    async _deleteMessage(messageGroup) {
        try {
            const response = await window.pywebview.api.delete_message(this.messageId);
            if (response && response.ok) {
                // Add a fade-out animation before removing
                messageGroup.style.transition = 'opacity 0.3s ease';
                messageGroup.style.opacity = '0';
                
                this._showToast('Message deleted successfully', 'success');
                
                // Remove the element after animation completes
                setTimeout(() => messageGroup.remove(), 300);
            } else {
                let errorMessage = 'Failed to delete message';
                
                if (response && response.error) {
                    errorMessage = response.error === 'MESSAGE_ACCESSDENIED' ? 
                        'You do not have permission to delete this message' : 
                        response.error;
                }
                
                this._showToast(errorMessage, 'error', 5000);
                console.error('Failed to delete message:', response);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            this._showToast('Error connecting to server', 'error', 5000);
        }
    }
    
    // New method to show toast notifications
    _showToast(message, type = 'success', duration = 5000) {
        // Create toast container if it doesn't exist yet
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Get icon based on type
        let iconClass = 'fa-check';
        if (type === 'error') iconClass = 'fa-times';
        else if (type === 'warning') iconClass = 'fa-exclamation-triangle';
        else if (type === 'info') iconClass = 'fa-info-circle';
        
        // Create the toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
            <div class="toast-progress"></div>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Setup progress bar animation
        const progressBar = toast.querySelector('.toast-progress');
        progressBar.style.width = '100%';
        progressBar.style.transitionDuration = `${duration}ms`;
        
        // Define function to dismiss toast
        const dismissToast = () => {
            toast.classList.add('fade-out');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => progressBar.style.width = '0%', 10);
        }, 10);
        
        // Set up auto-dismiss and close button
        let dismissTimeout = setTimeout(dismissToast, duration);
        toast.querySelector('.toast-close').addEventListener('click', dismissToast);
        
        // Pause/resume progress on hover
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
