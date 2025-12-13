// Forge Wallet - Content Script (Bridge to Background)
// This runs in ISOLATED world and handles communication with background script
(function() {
    'use strict';
    
    // Production mode flag
    const PRODUCTION_MODE = true;
    
    // Listen for disconnect from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'FORGE_WALLET_DISCONNECT') {
            window.postMessage({ type: 'FORGE_WALLET_DISCONNECT' }, '*');
        }
    });
    
    // Listen for messages from provider (MAIN world) and forward to background
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        if (!event.data.type || event.data.type !== 'FORGE_WALLET_REQUEST') return;
        
        console.log('🔥 Bridge: forwarding', event.data.method, 'to background');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'providerRequest',
                method: event.data.method,
                params: event.data.params,
                origin: window.location.origin,
                id: event.data.id
            });
            
            window.postMessage({
                type: 'FORGE_WALLET_RESPONSE',
                id: event.data.id,
                result: response
            }, '*');
        } catch (error) {
            console.error('🔥 Bridge error:', error);
            window.postMessage({
                type: 'FORGE_WALLET_RESPONSE',
                id: event.data.id,
                error: error.message
            }, '*');
        }
    });
    
    console.log('🔥 Forge Wallet bridge ready');
})();
