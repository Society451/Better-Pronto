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
            this._addImageContent(contentElement);
        } else if (this.hasImage) {
            this._addImagePlaceholder(contentElement);
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

        this._addDeleteButton(messageElement);

        return messageElement;
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

    _addDeleteButton(messageElement) {
        /* Add delete icon if permission is granted */
        if (true) { // Using true instead of hasDeletePermission since it's a constant
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
    }
}
