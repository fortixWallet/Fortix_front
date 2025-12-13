// ============ SESSION LOCK STATE ============
let isWalletLocked = true; // Start locked until verified

// ============ INACTIVITY AUTO-LOCK ============
let inactivityTimeout = null;

function getInactivityLimit() {
    // Get timeout from settings (in minutes), default 5 minutes
    // 0 means "never" - no auto-lock
    const timeoutMinutes = userSettings?.security?.autoLockTimeout ?? 5;
    return timeoutMinutes * 60 * 1000; // Convert to milliseconds
}

function resetInactivityTimer() {
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    // Only set timer if wallet is unlocked
    if (!isWalletLocked) {
        const limit = getInactivityLimit();
        // If limit is 0 (never), don't set timeout
        if (limit > 0) {
            inactivityTimeout = setTimeout(async () => {
                await lockWalletDueToInactivity();
            }, limit);
        }
    }
}

async function lockWalletDueToInactivity() {
    if (isWalletLocked) return; // Already locked
    
    try {
        await chrome.runtime.sendMessage({ action: 'clearSession' });
        isWalletLocked = true;
        stopAutoRefresh();
        stopSessionCheck();
        showUnlockScreen();
        showToast('Locked due to inactivity', 'info');
        
        // Close sidepanel if open
        closeSidepanel();
    } catch (e) {
        console.error('Error locking wallet:', e);
    }
}

let inactivityListenersAdded = false;

function startInactivityTimer() {
    // Only add listeners once
    if (!inactivityListenersAdded) {
        ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });
        inactivityListenersAdded = true;
    }
    resetInactivityTimer();
}

function stopInactivityTimer() {
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
}

// ============ SESSION EXPIRED LISTENER ============
// Listen for session expiry notification from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SESSION_EXPIRED') {
        console.log('[LOCK] Session expired notification received');
        isWalletLocked = true;
        stopAutoRefresh();
        stopSessionCheck();
        stopInactivityTimer();
        showUnlockScreen();
        showToast('Session expired', 'warning');
        
        // Close sidepanel if open
        closeSidepanel();
    }
});

// Check session and lock if expired
async function checkSessionLock() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'checkSession' });
        if (!response.unlocked) {
            isWalletLocked = true;
            showUnlockScreen();
            return false;
        }
        isWalletLocked = false;
        return true;
    } catch (e) {
        console.error('Session check error:', e);
        isWalletLocked = true;
        showUnlockScreen();
        return false;
    }
}

// Guard function - call before any sensitive action
async function requireUnlocked() {
    if (isWalletLocked) {
        showUnlockScreen();
        return false;
    }
    // Double-check with background
    return await checkSessionLock();
}
