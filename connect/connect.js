// Connect Page Script

// Production mode - disable verbose logging
const PRODUCTION_MODE = true;
if (PRODUCTION_MODE) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.error for critical errors
}

// Get origin from URL params
const params = new URLSearchParams(window.location.search);
const origin = params.get('origin');
const requestId = params.get('requestId');
const faviconParam = params.get('favicon'); // Favicon URL from service worker

// Security check results
let securityCheckResult = null;

if (!origin) {
    console.error('No origin provided');
    window.close();
}

// Load site info
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const url = new URL(origin);
        
        // Set site URL
        document.getElementById('siteUrl').textContent = url.hostname;
        
        // Load favicon
        const faviconImg = document.getElementById('siteFavicon');
        const siteEmoji = document.getElementById('siteEmoji');
        
        // Favicon sources in priority order:
        // 1. Favicon from tab (passed via URL param) - most reliable
        // 2. faviconkit.com (used by MetaMask)
        // 3. Google favicon service
        // 4. DuckDuckGo
        const faviconSources = [];
        
        if (faviconParam) {
            faviconSources.push(faviconParam);
        }
        
        faviconSources.push(
            `https://api.faviconkit.com/${url.hostname}/64`,
            `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
            `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`,
            `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=64`
        );
        
        let currentSourceIndex = 0;
        
        function tryNextFavicon() {
            if (currentSourceIndex >= faviconSources.length) {
                // All sources failed, show fallback icon
                faviconImg.style.display = 'none';
                siteEmoji.style.display = 'block';
                return;
            }
            
            faviconImg.src = faviconSources[currentSourceIndex];
            currentSourceIndex++;
        }
        
        faviconImg.onload = function() {
            // Check if image is valid (not a 1x1 placeholder)
            if (this.naturalWidth > 1 && this.naturalHeight > 1) {
                faviconImg.style.display = 'block';
                siteEmoji.style.display = 'none';
            } else {
                tryNextFavicon();
            }
        };
        
        faviconImg.onerror = function() {
            tryNextFavicon();
        };
        
        // Start loading
        tryNextFavicon();
        
        // Load account info
        const result = await chrome.storage.local.get(['accounts', 'currentAccountIndex']);
        if (result.accounts && result.accounts.length > 0) {
            const accountIndex = result.currentAccountIndex || 0;
            const account = result.accounts[accountIndex] || result.accounts[0];
            const accountAvatar = account.name.slice(0, 2).toUpperCase();
            
            document.getElementById('accountAvatar').textContent = accountAvatar;
            document.getElementById('shortAddress').textContent = 
                account.address.slice(0, 6) + '...' + account.address.slice(-4);
        }
        
        // GoPlus Security Check - Check for phishing/malicious dApp
        await checkDappSecurity(origin);
        
        // Event listeners
        document.getElementById('cancelBtn').addEventListener('click', handleCancel);
        document.getElementById('connectBtn').addEventListener('click', handleConnect);
        
    } catch (error) {
        console.error('Error loading connect page:', error);
    }
});

/**
 * Check dApp security using GoPlus API
 * @param {string} dappUrl - The dApp URL to check
 */
async function checkDappSecurity(dappUrl) {
    try {
        console.log('🛡️ GoPlus: Checking dApp security for', dappUrl);
        
        // Check phishing site first
        const phishingResponse = await chrome.runtime.sendMessage({
            action: 'checkPhishingSite',
            url: dappUrl
        });
        
        if (phishingResponse?.success && phishingResponse.data?.isPhishing) {
            showSecurityWarning('phishing', {
                title: 'PHISHING SITE DETECTED',
                message: 'This website has been identified as a phishing site. Connecting may result in loss of funds.',
                severity: 'critical'
            });
            return;
        }
        
        // Check dApp security
        const dappResponse = await chrome.runtime.sendMessage({
            action: 'checkDappSecurity',
            url: dappUrl
        });
        
        if (dappResponse?.success && dappResponse.data) {
            securityCheckResult = dappResponse.data;
            
            if (dappResponse.data.isRisky) {
                const risks = dappResponse.data.risks || [];
                showSecurityWarning('risky', {
                    title: 'Security Warning',
                    message: 'This dApp has potential security risks. Proceed with caution.',
                    risks: risks,
                    severity: 'warning'
                });
            } else if (dappResponse.data.isKnown && dappResponse.data.isAudited) {
                // Show verified badge
                showVerifiedBadge(dappResponse.data.projectName);
            }
        }
        
    } catch (error) {
        // Don't block connection on security check failure
    }
}

/**
 * Show security warning banner
 */
function showSecurityWarning(type, data) {
    const warningContainer = document.createElement('div');
    warningContainer.className = `security-warning ${type}`;
    
    const iconSvg = type === 'phishing' 
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    
    warningContainer.innerHTML = `
        <div class="security-warning-icon">${iconSvg}</div>
        <div class="security-warning-content">
            <div class="security-warning-title">${data.title}</div>
            <div class="security-warning-message">${data.message}</div>
            ${data.risks && data.risks.length > 0 ? `
                <ul class="security-warning-risks">
                    ${data.risks.map(r => `<li>${r.message}</li>`).join('')}
                </ul>
            ` : ''}
            <div class="security-warning-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>GoPlus Security</div>
        </div>
    `;
    
    // Insert before the connect button container
    const connectCard = document.querySelector('.connect-card');
    if (connectCard) {
        connectCard.insertBefore(warningContainer, connectCard.querySelector('.connect-actions'));
    }
    
    // If phishing, disable connect button
    if (type === 'phishing') {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Blocked';
            connectBtn.style.background = '#666';
            connectBtn.style.cursor = 'not-allowed';
        }
    }
}

/**
 * Show verified dApp badge
 */
function showVerifiedBadge(projectName) {
    const badge = document.createElement('div');
    badge.className = 'verified-badge';
    badge.innerHTML = `
        <span class="verified-icon">✓</span>
        <span class="verified-text">${projectName || 'Verified'} - Audited</span>
    `;
    
    const siteInfo = document.querySelector('.site-info');
    if (siteInfo) {
        siteInfo.appendChild(badge);
    }
}

// Handle cancel
async function handleCancel() {
    await chrome.runtime.sendMessage({
        action: 'rejectConnection',
        origin: origin,
        requestId: requestId
    });
    
    window.close();
}

// Handle connect
async function handleConnect() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'approveConnection',
            origin: origin,
            requestId: requestId
        });
        
        if (response.success) {
            console.log('✅ Connection approved');
            window.close();
        } else {
            alert('Error: ' + response.error);
        }
    } catch (error) {
        console.error('Error connecting:', error);
        alert('Error connecting to site');
    }
}

// Handle window close
window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({
        action: 'rejectConnection',
        origin: origin,
        requestId: requestId
    }).catch(() => {});
});
