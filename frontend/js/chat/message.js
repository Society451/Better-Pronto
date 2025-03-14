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
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'delete-confirmation-content';
            
            // Add modal header
            const modalHeader = document.createElement('h3');
            modalHeader.textContent = 'Delete Message';
            modalContent.appendChild(modalHeader);
            
            // Add modal message
            const modalMessage = document.createElement('p');
            modalMessage.textContent = 'Are you sure you want to delete this message?';
            modalContent.appendChild(modalMessage);
            
            // Add buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'delete-confirmation-buttons';
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'delete-confirmation-btn cancel';
            cancelButton.textContent = 'Cancel';
            cancelButton.onclick = () => {
                modal.classList.remove('active');
            };
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-confirmation-btn delete';
            deleteButton.textContent = 'Delete';
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(deleteButton);
            modalContent.appendChild(buttonContainer);
            
            // Add tip about shift key
            const tipText = document.createElement('div');
            tipText.className = 'delete-confirmation-tip';
            tipText.textContent = 'Tip: Hold Shift while clicking delete for quick deletion';
            modalContent.appendChild(tipText);
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close modal when clicking outside of it
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Update delete button action for this specific message
        const deleteButton = modal.querySelector('.delete-confirmation-btn.delete');
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
                
                // Remove the element after animation completes
                setTimeout(() => {
                    messageGroup.remove();
                }, 300);
            } else {
                // Create error message
                const errorDiv = document.createElement('div');
                errorDiv.classList.add('error-popup');
                errorDiv.textContent = response.error === 'MESSAGE_ACCESSDENIED' ? 
                    'You do not have permission to delete this message.' : 
                    'Failed to delete message.';
                
                // Find the message element
                const messageElement = messageGroup.querySelector('.message');
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

    _addImageContent(contentElement) {
        // External GIF or image with direct URL (like Giphy)
        if (this.imageData.is_external && this.imageData.url) {
            this._addExternalImage(contentElement);
        }
        // Local downloaded image with relative path
        else if (this.imageData.relative_path) {
            this._addLocalImage(contentElement);
        } else {
            // Fallback if local image is not available
            this._addImagePlaceholder(contentElement);
        }
    }

    _addExternalImage(contentElement) {
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
        this._setImageDimensions(imgElement);
        
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
        this._addImageCaption(contentElement);
    }

    _addLocalImage(contentElement) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('message-image');
        
        // Get the bubble ID from current URL or other source
        const bubbleID = window.currentChatID;
        const sanitizedBubbleID = bubbleID ? bubbleID.replace(/[<>:"\/\\|?*]/g, '_') : '';
        
        // Create a path to the local image file - UPDATED PATH STRUCTURE
        const appDataPath = '../../../.bpro/data/chats/';
        let bubblePath = '';
        
        // Handle different bubble location patterns based on actual directory structure
        if (sanitizedBubbleID === '3640189') {
            bubblePath = `bubbles/OHS - home of Pixels/${sanitizedBubbleID}`;
        } else if (sanitizedBubbleID.includes('Clubs')) {
            bubblePath = `bubbles/Clubs/${sanitizedBubbleID}`;
        } else {
            bubblePath = sanitizedBubbleID;
        }
        
        // Use the relative path directly since it now includes the file extension from the server
        const imagePath = `${appDataPath}${bubblePath}/${this.imageData.relative_path}`;
        imgElement.src = imagePath;
        
        console.log("Image details:", {
            bubbleID: bubbleID,
            sanitizedID: sanitizedBubbleID,
            relativePath: this.imageData.relative_path,
            fullPath: imagePath
        });
        
        // Set dimensions if available, with max constraints
        this._setImageDimensions(imgElement);
        
        imgElement.alt = this.imageData.title || 'Attached image';
        imgElement.title = this.imageData.title || '';
        
        // Modified error handler to prevent debug message spam
        let hasAddedDebugInfo = false;
        let attemptCount = 0;
        const maxAttempts = 3;
        
        // Handle image loading error with better diagnostics
        imgElement.onerror = () => {
            console.error("Failed to load message image:", imgElement.src);
            attemptCount++;
            
            // Only try alternative paths for the first few attempts
            if (attemptCount <= maxAttempts) {
                // Try to find image in different possible locations
                let alternativePaths = [
                    // Try with category structure (OHS - home of Pixels)
                    `../../../.bpro/data/chats/bubbles/OHS - home of Pixels/${sanitizedBubbleID}/${this.imageData.relative_path}`,
                    // Try with different category structure (Student Community)
                    `../../../.bpro/data/chats/bubbles/2024-25 Student Community & Resources/${sanitizedBubbleID}/${this.imageData.relative_path}`,
                    // Direct path
                    `../../../.bpro/data/chats/${sanitizedBubbleID}/${this.imageData.relative_path}`,
                    // Try with different folder structure
                    `../../../.bpro/data/chats/${bubblePath}/media/${sanitizedBubbleID}/${this.imageData.relative_path.split('/').pop()}`
                ];
                
                if (alternativePaths.length > 0) {
                    console.log(`Attempt ${attemptCount}: Trying alternative path:`, alternativePaths[0]);
                    imgElement.src = alternativePaths.shift(); // Try the next path
                } else {
                    this._showImageError(imgElement);
                }
            } else {
                this._showImageError(imgElement);
            }
        };
        
        contentElement.appendChild(imgElement);
        
        // Add image caption if there's also text content
        this._addImageCaption(contentElement);
    }

    _showImageError(imgElement) {
        const hasAddedDebugInfo = imgElement.hasAttribute('data-debug-added');
        if (!hasAddedDebugInfo) {
            imgElement.setAttribute('data-debug-added', 'true');
            imgElement.src = "../images/image-error.png"; // Fallback image
            imgElement.alt = "Image failed to load";
            
            // Create a debug message with file path info - ONLY ONCE
            const debugInfo = document.createElement('div');
            debugInfo.classList.add('image-debug-info');
            debugInfo.textContent = `Unable to load image: ${this.imageData.relative_path}`;
            imgElement.parentNode.appendChild(debugInfo);
            
            // Add a button to open the original image with authentication
            if (this.imageData.url) {
                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = "Open Original";
                downloadBtn.classList.add('image-download-btn');
                downloadBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        await window.pywebview.api.open_authenticated_image(this.imageData.url);
                    } catch (error) {
                        console.error("Error opening authenticated image:", error);
                    }
                };
                imgElement.parentNode.appendChild(downloadBtn);
            }
        }
    }

    _setImageDimensions(imgElement) {
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
    }

    _addImageCaption(contentElement) {
        // Add image caption if there's also text content
        if (this.content && this.content.trim() !== '') {
            const captionElement = document.createElement('div');
            captionElement.classList.add('image-caption');
            captionElement.textContent = this.content;
            contentElement.appendChild(captionElement);
        }
    }

    _addImagePlaceholder(contentElement) {
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
    }
}
