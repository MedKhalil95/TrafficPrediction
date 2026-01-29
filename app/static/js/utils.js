// utils.js - Utility functions
const Utils = (function() {
    let notificationTimeout = null;
    
    return {
        showNotification: function(message, type = 'info', duration = 3000) {
            // Clear existing timeout
            if (notificationTimeout) {
                clearTimeout(notificationTimeout);
            }
            
            // Remove existing notifications
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(n => n.remove());
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px;
                background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#007bff'};
                color: white;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10000;
                max-width: 300px;
            `;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="${icons[type] || 'fas fa-info-circle'}" style="font-size: 20px;"></i>
                    <div>${message}</div>
                </div>
            `;
            
            // Add to page
            document.body.appendChild(notification);
            
            // Remove after duration
            notificationTimeout = setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        },
        
        showLoading: function(message = 'Loading...') {
            // Create loading overlay if it doesn't exist
            let overlay = document.getElementById('loadingOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                `;
                
                overlay.innerHTML = `
                    <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; min-width: 300px;">
                        <div style="font-size: 40px; color: #007bff; margin-bottom: 20px;">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #333;">${message}</h3>
                        <p style="color: #666; margin: 0;">Please wait...</p>
                    </div>
                `;
                
                document.body.appendChild(overlay);
            } else {
                overlay.style.display = 'flex';
                const messageEl = overlay.querySelector('h3');
                if (messageEl) messageEl.textContent = message;
            }
        },
        
        hideLoading: function() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    };
})();

window.Utils = Utils;