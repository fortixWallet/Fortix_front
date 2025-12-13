function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.style.cssText = `
        background: ${colors[type]};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 250px;
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 16px;">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loader functions
function showLoader() {
    const loader = document.getElementById('loaderContainer');
    if (loader) {
        loader.classList.remove('fade-out');
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    const loader = document.getElementById('loaderContainer');
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// Hide loader instantly without animation (for modal transitions)
function hideLoaderInstant() {
    const loader = document.getElementById('loaderContainer');
    if (loader) {
        loader.style.display = 'none';
        loader.classList.add('fade-out');
    }
}

// Add animations to style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Format seed phrase as simple string with copy button
function formatSeedPhrase(seedPhrase) {
    return `
        <div id="seedPhraseContainer" style="position: relative;">
            <div id="seedPhraseText" class="blurred" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); word-break: break-word; line-height: 1.8; filter: blur(8px); transition: filter 0.3s; user-select: none;">
                ${seedPhrase}
            </div>
            <div id="seedPhraseOverlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(2px);">
                <div style="background: var(--accent-blue); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); display: flex; align-items: center; gap: 6px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <span style="font-size: 16px;">👁️</span>
                    <span>Click to reveal</span>
                </div>
            </div>
        </div>
        <button id="copySeedBtn" data-seed="${seedPhrase}" style="width: 100%; margin-top: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; font-size: 12px; color: var(--text-primary); cursor: pointer; display: none; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='var(--accent-blue)'; this.style.color='white'; this.style.borderColor='var(--accent-blue)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.color='var(--text-primary)'; this.style.borderColor='var(--border-color)'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy Seed Phrase
        </button>
    `;
}

