// ================================================================================================
// CS2 TRADING TRACKER - STEAM API UTILITY
// ================================================================================================
// Steam Market API integration for price history and market data
// ================================================================================================

class SteamAPI {
    constructor() {
        this.baseUrl = 'https://steamcommunity.com/market'
        this.appId = 730 // CS2 App ID
        this.currency = 3 // USD
        this.country = 'US'
        
        // Rate limiting to avoid being blocked
        this.requestDelay = 1000 // 1 second between requests
        this.lastRequestTime = 0
        
        console.log('🔧 Steam API service initialized')
    }

    // Rate limiting helper
    async waitForRateLimit() {
        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime
        
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        this.lastRequestTime = Date.now()
    }

    // Get price history for an item
    async getPriceHistory(marketHashName) {
        try {
            console.log(`📊 Fetching price history for: ${marketHashName}`)
            
            await this.waitForRateLimit()
            
            const url = `${this.baseUrl}/pricehistory/` +
                       `?country=${this.country}` +
                       `&currency=${this.currency}` +
                       `&appid=${this.appId}` +
                       `&market_hash_name=${encodeURIComponent(marketHashName)}`
            
            console.log('🌐 Steam API URL:', url)
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                // Add CORS mode to handle cross-origin requests
                mode: 'cors'
            })
            
            if (!response.ok) {
                throw new Error(`Steam API error: ${response.status} ${response.statusText}`)
            }
            
            const data = await response.json()
            
            if (!data.success) {
                throw new Error('Steam API returned unsuccessful response')
            }
            
            console.log(`✅ Fetched ${data.prices?.length || 0} price points`)
            
            return this.processPriceHistory(data.prices || [])
            
        } catch (error) {
            console.error('❌ Failed to fetch Steam price history:', error)
            
            // Return mock data for development/testing
            if (marketHashName.includes('Karambit') && marketHashName.includes('Lore')) {
                console.log('🔧 Using mock data for Karambit | Lore')
                return this.getMockKarambitLoreData()
            }
            
            throw error
        }
    }

    // Process raw Steam price history data
    processPriceHistory(prices) {
        if (!Array.isArray(prices) || prices.length === 0) {
            return { prices: [], stats: null }
        }

        const processedPrices = prices.map(pricePoint => {
            const [dateStr, price, volume] = pricePoint
            
            // Parse Steam date format: "Jun 20 2016 01: +0"
            const date = new Date(dateStr.replace(': +0', ''))
            
            return {
                date: date.toISOString(),
                price: parseFloat(price),
                volume: parseInt(volume) || 0,
                timestamp: date.getTime()
            }
        }).filter(point => !isNaN(point.price) && point.price > 0)

        // Sort by date
        processedPrices.sort((a, b) => a.timestamp - b.timestamp)

        // Calculate statistics
        const stats = this.calculatePriceStats(processedPrices)

        return {
            prices: processedPrices,
            stats,
            lastUpdated: new Date().toISOString()
        }
    }

    // Calculate price statistics
    calculatePriceStats(prices) {
        if (!prices || prices.length === 0) return null

        const priceValues = prices.map(p => p.price)
        const volumes = prices.map(p => p.volume)
        
        const currentPrice = priceValues[priceValues.length - 1]
        const oldestPrice = priceValues[0]
        
        const minPrice = Math.min(...priceValues)
        const maxPrice = Math.max(...priceValues)
        const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length
        
        const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0)
        const avgVolume = totalVolume / volumes.length
        
        // Calculate price changes for different time periods
        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000
        const changes = this.calculatePriceChanges(prices, now)
        
        return {
            current: currentPrice,
            min: minPrice,
            max: maxPrice,
            average: avgPrice,
            totalVolume,
            averageVolume: avgVolume,
            dataPoints: prices.length,
            dateRange: {
                from: prices[0].date,
                to: prices[prices.length - 1].date
            },
            changes
        }
    }

    // Calculate price changes for different time periods
    calculatePriceChanges(prices, currentTime) {
        const currentPrice = prices[prices.length - 1]?.price || 0
        const changes = {}
        
        const periods = {
            '24h': 1,
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }
        
        Object.entries(periods).forEach(([period, days]) => {
            const targetTime = currentTime - (days * 24 * 60 * 60 * 1000)
            
            // Find closest price point to target time
            let closestPrice = null
            let minTimeDiff = Infinity
            
            prices.forEach(price => {
                const timeDiff = Math.abs(price.timestamp - targetTime)
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff
                    closestPrice = price.price
                }
            })
            
            if (closestPrice) {
                const change = currentPrice - closestPrice
                const changePercent = ((change / closestPrice) * 100)
                
                changes[period] = {
                    absolute: change,
                    percent: changePercent,
                    oldPrice: closestPrice
                }
            }
        })
        
        return changes
    }

    // Filter price data by time range
    filterPricesByTimeRange(prices, range) {
        if (!prices || prices.length === 0) return []
        
        const now = Date.now()
        let startTime
        
        switch (range) {
            case '7d':
                startTime = now - (7 * 24 * 60 * 60 * 1000)
                break
            case '30d':
                startTime = now - (30 * 24 * 60 * 60 * 1000)
                break
            case '90d':
                startTime = now - (90 * 24 * 60 * 60 * 1000)
                break
            case '1y':
                startTime = now - (365 * 24 * 60 * 60 * 1000)
                break
            case 'all':
            default:
                return prices
        }
        
        return prices.filter(price => price.timestamp >= startTime)
    }

    // Mock data for testing (Karambit | Lore Battle-Scarred)
    getMockKarambitLoreData() {
        const basePrice = 1200
        const prices = []
        const now = Date.now()
        
        // Generate 2 years of daily price data
        for (let i = 730; i >= 0; i--) {
            const date = new Date(now - (i * 24 * 60 * 60 * 1000))
            
            // Simulate price fluctuations
            const trend = Math.sin(i / 100) * 200 // Long term trend
            const volatility = (Math.random() - 0.5) * 100 // Daily volatility
            const price = Math.max(800, basePrice + trend + volatility)
            
            // Simulate volume (higher volume on weekends/events)
            const volume = Math.floor(Math.random() * 10) + 1
            
            prices.push({
                date: date.toISOString(),
                price: Math.round(price * 100) / 100,
                volume,
                timestamp: date.getTime()
            })
        }
        
        const stats = this.calculatePriceStats(prices)
        
        return {
            prices,
            stats,
            lastUpdated: new Date().toISOString(),
            isMockData: true
        }
    }

    // Get current market price (separate from history)
    async getCurrentPrice(marketHashName) {
        try {
            console.log(`💰 Fetching current price for: ${marketHashName}`)
            
            // Note: This would typically use a different Steam API endpoint
            // For now, we'll use the last price from history
            const historyData = await this.getPriceHistory(marketHashName)
            
            if (historyData.prices && historyData.prices.length > 0) {
                const latestPrice = historyData.prices[historyData.prices.length - 1]
                return {
                    price: latestPrice.price,
                    currency: 'USD',
                    lastUpdated: latestPrice.date
                }
            }
            
            return null
            
        } catch (error) {
            console.error('❌ Failed to fetch current price:', error)
            throw error
        }
    }

    // Helper to format market hash name from item name
    formatMarketHashName(itemName) {
        // Steam market hash names have specific formatting
        // Example: "★ Karambit | Lore (Battle-Scarred)" 
        return itemName.trim()
    }

    // Enhanced search function for CS2 items
    async searchItems(query) {
        console.log(`🔍 Searching for items matching: "${query}"`)
        
        // Extended database of common CS2 items
        const itemDatabase = [
            // Knives - Karambit
            "★ Karambit | Lore (Battle-Scarred)",
            "★ Karambit | Lore (Well-Worn)",
            "★ Karambit | Lore (Field-Tested)",
            "★ Karambit | Lore (Minimal Wear)",
            "★ Karambit | Lore (Factory New)",
            "★ Karambit | Fade (Factory New)",
            "★ Karambit | Doppler (Factory New)",
            "★ Karambit | Tiger Tooth (Factory New)",
            "★ Karambit | Marble Fade (Factory New)",
            
            // Knives - Other
            "★ Butterfly Knife | Fade (Factory New)",
            "★ Butterfly Knife | Lore (Field-Tested)",
            "★ M9 Bayonet | Lore (Field-Tested)",
            "★ Bayonet | Lore (Field-Tested)",
            "★ Flip Knife | Doppler (Factory New)",
            "★ Gut Knife | Lore (Field-Tested)",
            
            // Rifles - AK-47
            "AK-47 | Redline (Field-Tested)",
            "AK-47 | Redline (Minimal Wear)",
            "AK-47 | Fire Serpent (Field-Tested)",
            "AK-47 | Fire Serpent (Minimal Wear)",
            "AK-47 | Vulcan (Field-Tested)",
            "AK-47 | Asiimov (Field-Tested)",
            "AK-47 | Bloodsport (Field-Tested)",
            
            // Rifles - M4A4/M4A1-S
            "M4A4 | Howl (Field-Tested)",
            "M4A4 | Howl (Minimal Wear)",
            "M4A4 | Asiimov (Field-Tested)",
            "M4A4 | The Emperor (Field-Tested)",
            "M4A1-S | Knight (Factory New)",
            "M4A1-S | Hot Rod (Factory New)",
            
            // Rifles - AWP
            "AWP | Dragon Lore (Battle-Scarred)",
            "AWP | Dragon Lore (Well-Worn)",
            "AWP | Dragon Lore (Field-Tested)",
            "AWP | Dragon Lore (Minimal Wear)",
            "AWP | Dragon Lore (Factory New)",
            "AWP | Lightning Strike (Factory New)",
            "AWP | Hyper Beast (Field-Tested)",
            "AWP | Asiimov (Field-Tested)",
            "AWP | Medusa (Field-Tested)",
            
            // Pistols
            "Desert Eagle | Printstream (Field-Tested)",
            "Desert Eagle | Printstream (Minimal Wear)",
            "Desert Eagle | Blaze (Factory New)",
            "Desert Eagle | Code Red (Factory New)",
            "Glock-18 | Fade (Factory New)",
            "Glock-18 | Water Elemental (Factory New)",
            "USP-S | Kill Confirmed (Field-Tested)",
            "USP-S | Neo-Noir (Factory New)",
            
            // Cases
            "Operation Bravo Case",
            "Operation Phoenix Case",
            "Operation Breakout Case",
            "Chroma Case",
            "Chroma 2 Case",
            "Chroma 3 Case",
            "Spectrum Case",
            "Spectrum 2 Case",
            "Gamma Case",
            "Gamma 2 Case",
            "Glove Case",
            "Clutch Case",
            "Horizon Case",
            "Danger Zone Case",
            "Prisma Case",
            "Prisma 2 Case",
            "CS20 Case",
            "Fracture Case",
            "Operation Broken Fang Case",
            "Snakebite Case",
            "Operation Riptide Case",
            "Dreams & Nightmares Case",
            "Recoil Case",
            "Revolution Case",
            
            // Sticker Capsules
            "Stockholm 2021 Legends Sticker Capsule",
            "Stockholm 2021 Challengers Sticker Capsule",
            "Katowice 2014 Legends Sticker Capsule",
            "Katowice 2014 Challengers Sticker Capsule",
            "Berlin 2019 Legends Sticker Capsule",
            "Berlin 2019 Challengers Sticker Capsule",
            "Boston 2018 Legends Sticker Capsule",
            "Boston 2018 Challengers Sticker Capsule"
        ]
        
        // Filter and sort results by relevance
        const lowerQuery = query.toLowerCase()
        const results = itemDatabase.filter(item => 
            item.toLowerCase().includes(lowerQuery)
        )
        
        // Sort by relevance: exact match first, then starts with, then contains
        results.sort((a, b) => {
            const aLower = a.toLowerCase()
            const bLower = b.toLowerCase()
            
            // Exact match
            if (aLower === lowerQuery && bLower !== lowerQuery) return -1
            if (bLower === lowerQuery && aLower !== lowerQuery) return 1
            
            // Starts with query
            if (aLower.startsWith(lowerQuery) && !bLower.startsWith(lowerQuery)) return -1
            if (bLower.startsWith(lowerQuery) && !aLower.startsWith(lowerQuery)) return 1
            
            // Alphabetical order
            return a.localeCompare(b)
        })
        
        const limitedResults = results.slice(0, 10)
        console.log(`💡 Found ${limitedResults.length} items matching "${query}"`)
        
        return limitedResults
    }

    // Validate item name format
    validateItemName(itemName) {
        if (!itemName || typeof itemName !== 'string') {
            return { valid: false, error: 'Item name must be a string' }
        }
        
        const trimmed = itemName.trim()
        if (trimmed.length === 0) {
            return { valid: false, error: 'Item name cannot be empty' }
        }
        
        if (trimmed.length < 3) {
            return { valid: false, error: 'Item name too short (minimum 3 characters)' }
        }
        
        if (trimmed.length > 100) {
            return { valid: false, error: 'Item name too long (maximum 100 characters)' }
        }
        
        return { valid: true, itemName: trimmed }
    }

    // Get item category
    getItemCategory(itemName) {
        const name = itemName.toLowerCase()
        
        if (name.includes('★')) {
            if (name.includes('karambit')) return { category: 'Knife', subcategory: 'Karambit' }
            if (name.includes('butterfly')) return { category: 'Knife', subcategory: 'Butterfly Knife' }
            if (name.includes('bayonet')) return { category: 'Knife', subcategory: 'Bayonet' }
            if (name.includes('flip')) return { category: 'Knife', subcategory: 'Flip Knife' }
            return { category: 'Knife', subcategory: 'Unknown' }
        }
        
        if (name.includes('ak-47')) return { category: 'Rifle', subcategory: 'AK-47' }
        if (name.includes('m4a4') || name.includes('m4a1-s')) return { category: 'Rifle', subcategory: 'M4' }
        if (name.includes('awp')) return { category: 'Sniper Rifle', subcategory: 'AWP' }
        if (name.includes('desert eagle')) return { category: 'Pistol', subcategory: 'Desert Eagle' }
        if (name.includes('glock')) return { category: 'Pistol', subcategory: 'Glock-18' }
        if (name.includes('usp')) return { category: 'Pistol', subcategory: 'USP-S' }
        
        if (name.includes('case')) return { category: 'Container', subcategory: 'Case' }
        if (name.includes('sticker') || name.includes('capsule')) return { category: 'Sticker', subcategory: 'Capsule' }
        
        return { category: 'Unknown', subcategory: 'Unknown' }
    }
}

// Create singleton instance
const steamAPI = new SteamAPI()

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SteamAPI, steamAPI }
} else if (typeof window !== 'undefined') {
    window.SteamAPI = SteamAPI
    window.steamAPI = steamAPI
}

console.log('🔧 Steam API utility loaded')