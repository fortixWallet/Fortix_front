// ============ TOKEN METADATA MODULE ============
// Centralized token metadata fetching and caching
// Uses: GET /api/v1/tokens/metadata/:chainId/:address

/**
 * Token Metadata Cache
 * Structure: { "chainId:address" -> { data, timestamp } }
 */
const TokenMetadataCache = {
    data: {},
    TTL: 10 * 60 * 1000, // 10 minutes cache

    /**
     * Get cache key for token
     */
    getKey(chainId, address) {
        return `${chainId}:${address.toLowerCase()}`;
    },

    /**
     * Get from cache if valid
     */
    get(chainId, address) {
        const key = this.getKey(chainId, address);
        const cached = this.data[key];
        if (cached && (Date.now() - cached.timestamp) < this.TTL) {
            return cached.data;
        }
        return null;
    },

    /**
     * Set cache entry
     */
    set(chainId, address, metadata) {
        const key = this.getKey(chainId, address);
        this.data[key] = {
            data: metadata,
            timestamp: Date.now()
        };
    },

    /**
     * Clear all cache
     */
    clear() {
        this.data = {};
    }
};

/**
 * Fetch token metadata from backend API
 * @param {string|number} chainId - Chain ID
 * @param {string} address - Token contract address
 * @param {boolean} useCache - Use cache if available (default: true)
 * @returns {Promise<Object|null>} Token metadata or null if failed
 *
 * Response structure:
 * {
 *   symbol: string,
 *   decimals: number,
 *   name: string,
 *   source: string,       // 'popular', 'manual', 'detected', 'api'
 *   tier: number,         // 1=whitelist, 2=popular, 3=detected
 *   isWhitelisted: boolean,
 *   isPopular: boolean,
 *   verified: boolean
 * }
 */
async function fetchTokenMetadata(chainId, address, useCache = true) {
    if (!chainId || !address) return null;

    // Skip native token addresses
    if (address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ||
        address === 'native') {
        return null;
    }

    // Check cache first
    if (useCache) {
        const cached = TokenMetadataCache.get(chainId, address);
        if (cached) {
            return cached;
        }
    }

    try {
        // Use FortixAPI if available, otherwise direct fetch
        if (typeof FortixAPI !== 'undefined' && FortixAPI.getTokenMetadata) {
            const response = await FortixAPI.getTokenMetadata(chainId, address);
            if (response && response.symbol) {
                TokenMetadataCache.set(chainId, address, response);
                return response;
            }
        } else {
            // Direct fetch fallback
            const url = `https://api.fortixwallet.com/api/v1/tokens/metadata/${chainId}/${address}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.symbol) {
                    TokenMetadataCache.set(chainId, address, data);
                    return data;
                }
            }
        }
    } catch (error) {
        console.warn(`[TokenMetadata] Failed to fetch for ${chainId}:${address}:`, error.message);
    }

    return null;
}

/**
 * Batch fetch metadata for multiple tokens using NEW batch endpoint
 * POST /api/v1/tokens/metadata/batch - reads from KV cache, very fast!
 * @param {string|number} chainId - Chain ID
 * @param {string[]} addresses - Array of token addresses
 * @returns {Promise<Object>} Map of address -> metadata
 */
async function fetchBatchTokenMetadata(chainId, addresses) {
    const results = {};
    const toFetch = [];

    // Check cache first for each token
    for (const address of addresses) {
        if (!address || address === 'native') continue;

        const cached = TokenMetadataCache.get(chainId, address);
        if (cached) {
            results[address.toLowerCase()] = cached;
        } else {
            toFetch.push(address);
        }
    }

    // Fetch missing tokens via batch endpoint (up to 250 per request)
    if (toFetch.length > 0) {
        try {
            // Prepare tokens array for batch API
            const tokensToRequest = toFetch.map(addr => ({
                chainId: Number(chainId),
                address: addr
            }));

            console.log(`[TokenMetadata] Batch fetching ${tokensToRequest.length} tokens`);

            // Use FortixAPI batch endpoint
            if (typeof FortixAPI !== 'undefined' && FortixAPI.getBatchTokenMetadata) {
                const response = await FortixAPI.getBatchTokenMetadata(tokensToRequest);

                if (response?.data?.tokens) {
                    for (const token of response.data.tokens) {
                        const addr = token.address?.toLowerCase();
                        if (addr) {
                            // Cache the result
                            TokenMetadataCache.set(chainId, addr, token);
                            results[addr] = token;
                        }
                    }
                    console.log(`[TokenMetadata] Got ${response.data.tokens.length} tokens from batch API`);
                }
            } else {
                // Fallback: direct fetch (shouldn't happen normally)
                const url = 'https://api.fortixwallet.com/api/v1/tokens/metadata/batch';
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tokens: tokensToRequest })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data?.data?.tokens) {
                        for (const token of data.data.tokens) {
                            const addr = token.address?.toLowerCase();
                            if (addr) {
                                TokenMetadataCache.set(chainId, addr, token);
                                results[addr] = token;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('[TokenMetadata] Batch fetch failed:', error.message);
            // Don't fail completely - return what we have from cache
        }
    }

    return results;
}

/**
 * Get token trust badge HTML based on metadata
 * @param {Object} metadata - Token metadata from API
 * @returns {string} HTML string for badge
 */
function getTokenBadgeHTML(metadata) {
    if (!metadata) return '';

    if (metadata.verified || metadata.isWhitelisted) {
        return '<span class="token-badge token-badge-verified" title="Verified Token">✓</span>';
    }

    if (metadata.isPopular) {
        return '<span class="token-badge token-badge-popular" title="Popular Token">★</span>';
    }

    // Tier-based badge (tier 1 = most trusted)
    if (metadata.tier === 1) {
        return '<span class="token-badge token-badge-verified" title="Verified Token">✓</span>';
    }
    if (metadata.tier === 2) {
        return '<span class="token-badge token-badge-popular" title="Popular Token">★</span>';
    }

    return '';
}

/**
 * Get token trust level description
 * @param {Object} metadata - Token metadata from API
 * @returns {Object} { level: string, color: string, description: string }
 */
function getTokenTrustLevel(metadata) {
    if (!metadata) {
        return {
            level: 'unknown',
            color: '#888',
            description: 'Unknown token - proceed with caution'
        };
    }

    if (metadata.verified || metadata.isWhitelisted || metadata.tier === 1) {
        return {
            level: 'verified',
            color: '#22c55e',
            description: 'Verified token from trusted source'
        };
    }

    if (metadata.isPopular || metadata.tier === 2) {
        return {
            level: 'popular',
            color: '#f59e0b',
            description: 'Popular token with good liquidity'
        };
    }

    if (metadata.tier === 3 || metadata.source === 'detected') {
        return {
            level: 'detected',
            color: '#6b7280',
            description: 'Auto-detected from transactions'
        };
    }

    return {
        level: 'unverified',
        color: '#ef4444',
        description: 'Unverified token - exercise caution'
    };
}

/**
 * Check if token is trusted (verified, popular, or in whitelist)
 * @param {Object} metadata - Token metadata
 * @returns {boolean}
 */
function isTokenTrusted(metadata) {
    if (!metadata) return false;
    return metadata.verified ||
           metadata.isWhitelisted ||
           metadata.isPopular ||
           metadata.tier <= 2;
}

/**
 * Auto-fill token form with metadata from API
 * @param {string} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {Promise<Object|null>} Metadata if found
 */
async function autoFillTokenMetadata(chainId, address) {
    const metadata = await fetchTokenMetadata(chainId, address);

    if (metadata) {
        // Auto-fill form fields if they exist
        const symbolInput = document.getElementById('tokenSymbol');
        const decimalsInput = document.getElementById('tokenDecimals');
        const nameDisplay = document.getElementById('tokenNamePreview');
        const trustBadge = document.getElementById('tokenTrustBadge');

        if (symbolInput && !symbolInput.value) {
            symbolInput.value = metadata.symbol || '';
        }
        if (decimalsInput && decimalsInput.value === '18') {
            decimalsInput.value = metadata.decimals || 18;
        }
        if (nameDisplay) {
            nameDisplay.textContent = metadata.name || metadata.symbol || '';
        }
        if (trustBadge) {
            const trust = getTokenTrustLevel(metadata);
            trustBadge.innerHTML = `<span style="color: ${trust.color}">${trust.description}</span>`;
        }
    }

    return metadata;
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.TokenMetadataCache = TokenMetadataCache;
    window.fetchTokenMetadata = fetchTokenMetadata;
    window.fetchBatchTokenMetadata = fetchBatchTokenMetadata;
    window.getTokenBadgeHTML = getTokenBadgeHTML;
    window.getTokenTrustLevel = getTokenTrustLevel;
    window.isTokenTrusted = isTokenTrusted;
    window.autoFillTokenMetadata = autoFillTokenMetadata;
}
