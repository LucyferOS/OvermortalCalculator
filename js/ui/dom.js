
// Small DOM helpers shared by every view.


class Dom {
    static updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    static updateCell(cellId, value) {
        const element = document.getElementById(cellId);
        if (element) {
            element.textContent = value;
        }
    }

    static updateProgressBar(elementId, percent) {
        const element = document.getElementById(elementId);
        if (element) {
            // Cap visual width at 100% to prevent overflow, but show actual percentage in text
            const visualWidth = Math.min(100, percent);
            element.style.width = `${visualWidth}%`;
            element.textContent = `${percent.toFixed(1)}%`;
        }
    }

    static showNotification(message, isError = false) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.simple-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `simple-notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            background-color: ${isError ? 'var(--accent)' : 'var(--success)'};
            border-left: 4px solid ${isError ? '#A54545' : '#2E6B4F'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    static showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            button.disabled = true;
        }
    }

    static hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

}

export { Dom };
