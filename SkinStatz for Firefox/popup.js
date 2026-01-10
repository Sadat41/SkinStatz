// Popup JavaScript for SkinStatz Extension
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 SkinStatz popup loaded');
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Main dashboard button
    const dashboardBtn = document.getElementById('openDashboard');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', openDashboard);
    }
}

async function openDashboard() {
    try {
        console.log('📊 Opening SkinStatz dashboard...');
        
        // Create a new tab with the main application
        const dashboardUrl = chrome.runtime.getURL('index.html');
        
        await chrome.tabs.create({
            url: dashboardUrl,
            active: true
        });
        
        // Close the popup
        window.close();
    } catch (error) {
        console.error('❌ Error opening dashboard:', error);
        
        // Fallback: try to open in current tab
        try {
            const dashboardUrl = chrome.runtime.getURL('index.html');
            chrome.tabs.update({ url: dashboardUrl });
            window.close();
        } catch (fallbackError) {
            console.error('❌ Fallback failed:', fallbackError);
            showError('Failed to open dashboard. Please try again.');
        }
    }
}

function formatCurrency(value) {
    if (value === 0) return '$0.00';
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${(value / 1000000).toFixed(1)}M`;
}

function showError(message) {
    // Create a simple error display
    const content = document.querySelector('.content');
    if (content) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #fca5a5;
            font-size: 12px;
            text-align: center;
            margin-top: 10px;
        `;
        errorDiv.textContent = message;
        content.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}