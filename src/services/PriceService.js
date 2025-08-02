// ============================================================================================
// PRICE SERVICE - Real-time CSFloat and Buff163 Price Fetching
// ============================================================================================
// Fetches real-time prices from CSGoTrader APIs for CSFloat and Buff163
// Supports Doppler items with phase-specific pricing
// ============================================================================================

export class PriceService {
    constructor() {
        this.priceDataCache = null
        this.priceCacheTimestamp = null
        this.isLoading = false
    }

    /**
     * Fetch price data from APIs
     */
    async fetchPriceData() {
        // Use cache if it's less than 1 hour old
        if (this.priceDataCache && (Date.now() - this.priceCacheTimestamp < 3600000)) {
            return this.priceDataCache
        }

        // Prevent multiple simultaneous fetches
        if (this.isLoading) {
            // Wait for current fetch to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            return this.priceDataCache
        }

        this.isLoading = true
        console.log('📡 Fetching fresh prices from csgotrader.app APIs...')
        
        try {
            // Use CORS proxy to bypass CORS restrictions
            const corsProxy = 'https://corsproxy.io/?'
            const [csfloatResponse, buffResponse] = await Promise.all([
                fetch(corsProxy + 'https://prices.csgotrader.app/latest/csfloat.json'),
                fetch(corsProxy + 'https://prices.csgotrader.app/latest/buff163.json')
            ])

            if (!csfloatResponse.ok || !buffResponse.ok) {
                throw new Error('Failed to fetch price data')
            }

            const csfloatData = await csfloatResponse.json()
            const buffData = await buffResponse.json()
            
            this.priceDataCache = this.combinePriceData(csfloatData, buffData)
            this.priceCacheTimestamp = Date.now()
            this.isLoading = false
            
            console.log(`✅ Price cache updated with ${Object.keys(this.priceDataCache).length} items.`)
            return this.priceDataCache

        } catch (error) {
            console.error('❌ Error fetching prices:', error.message)
            this.isLoading = false
            return this.priceDataCache || {}
        }
    }

    /**
     * Get sample price data for demonstration (temporary solution for CORS issue)
     */
    getSamplePriceData(source) {
        // Sample CS2 item prices for common items
        const samplePrices = {
            "ak-47 | redline (field-tested)": { price: 65.20 },
            "ak-47 | redline (minimal wear)": { price: 125.50 },
            "ak-47 | redline (well-worn)": { price: 45.80 },
            "m4a4 | howl (field-tested)": { price: 2850.00 },
            "awp | dragon lore (field-tested)": { price: 4200.00 },
            "karambit | doppler (factory new)": { 
                price: 650.00,
                doppler: {
                    "Phase 1": 620.00,
                    "Phase 2": 680.00,
                    "Phase 3": 590.00,
                    "Phase 4": 650.00,
                    "Sapphire": 4500.00,
                    "Ruby": 3800.00
                }
            },
            "★ karambit | doppler (factory new)": { 
                price: 650.00,
                doppler: {
                    "Phase 1": 620.00,
                    "Phase 2": 680.00,
                    "Phase 3": 590.00,
                    "Phase 4": 650.00,
                    "Sapphire": 4500.00,
                    "Ruby": 3800.00
                }
            },
            "dreams & nightmares case": { price: 1.63 },
            "revolver case": { price: 0.15 },
            "operation bravo case": { price: 45.20 },
            "ak-47 | fire serpent (field-tested)": { price: 850.00 },
            "m4a1-s | hot rod (factory new)": { price: 75.30 },
            "glock-18 | fade (factory new)": { price: 285.00 }
        }

        // Simulate different pricing between sources
        if (source === 'buff163') {
            // Buff163 typically has slightly different prices
            const adjustedPrices = {}
            for (const [key, data] of Object.entries(samplePrices)) {
                adjustedPrices[key] = {
                    starting_at: {
                        price: data.price * 0.92, // Buff163 often ~8% lower
                        doppler: data.doppler ? Object.fromEntries(
                            Object.entries(data.doppler).map(([phase, price]) => [phase, price * 0.92])
                        ) : null
                    }
                }
            }
            return adjustedPrices
        }

        return samplePrices
    }

    /**
     * Combine price data from both APIs (preserving doppler structure)
     */
    combinePriceData(csfloatData, buffData) {
        const combinedPrices = {}

        // Add CSFloat prices (preserve doppler structure)
        for (const [name, data] of Object.entries(csfloatData)) {
            combinedPrices[name.toLowerCase()] = { 
                csfloatPrice: data.price,
                csfloatDoppler: data.doppler || null
            }
        }
        
        // Add Buff163 prices (preserve doppler structure)
        for (const [name, data] of Object.entries(buffData)) {
            const lowerName = name.toLowerCase()
            if (!combinedPrices[lowerName]) {
                combinedPrices[lowerName] = {}
            }
            
            if (data?.starting_at?.price) {
                combinedPrices[lowerName].buffPrice = data.starting_at.price
                if (data.starting_at.doppler) {
                    combinedPrices[lowerName].buffDoppler = data.starting_at.doppler
                }
            }
        }
        
        return combinedPrices
    }

    /**
     * Check if item is a Doppler item and extract phase/gem
     */
    parseDopplerItem(itemName) {
        const lowerName = itemName.toLowerCase()
        
        // Check if it contains "doppler"
        if (!lowerName.includes('doppler')) {
            return { isDoppler: false }
        }
        
        // Define phase/gem patterns
        const patterns = [
            // Gem patterns
            { 
                regex: /\|\s*doppler\s*[-\s]*sapphire/i, 
                phase: 'Sapphire',
                replacement: '| Doppler'
            },
            { 
                regex: /\|\s*doppler\s*[-\s]*ruby/i, 
                phase: 'Ruby',
                replacement: '| Doppler'
            },
            { 
                regex: /\|\s*doppler\s*[-\s]*emerald/i, 
                phase: 'Emerald',
                replacement: '| Doppler'
            },
            { 
                regex: /\|\s*doppler\s*[-\s]*black\s+pearl/i, 
                phase: 'Black Pearl',
                replacement: '| Doppler'
            },
            // Phase patterns
            { 
                regex: /\|\s*doppler\s*[-\s]*phase\s+([1-4])/i, 
                phase: 'Phase',
                replacement: '| Doppler'
            },
            { 
                regex: /\|\s*doppler\s*\(\s*phase\s+([1-4])\s*\)/i, 
                phase: 'Phase',
                replacement: '| Doppler'
            }
        ]
        
        for (const pattern of patterns) {
            const match = itemName.match(pattern.regex)
            
            if (match) {
                let phase = pattern.phase
                if (pattern.phase === 'Phase' && match[1]) {
                    phase = `Phase ${match[1]}`
                }
                
                // Create base name by replacing the matched part with just "| Doppler"
                const baseName = itemName.replace(pattern.regex, pattern.replacement)
                
                return {
                    isDoppler: true,
                    baseName: baseName.trim(),
                    phase: phase
                }
            }
        }
        
        return { isDoppler: false }
    }

    /**
     * Generate name variations for matching
     */
    generateNameVariations(itemName) {
        const variations = []
        let workingName = itemName.trim()
        
        // Original name
        variations.push(workingName)
        
        // Fix quality: "Factory-New" → "Factory New"
        const qualityFixed = workingName.replace(/\(([^)]+)\)/, (match, quality) => {
            return `(${quality.replace(/-/g, ' ')})`
        })
        variations.push(qualityFixed)
        
        // Add star for knives
        const knifeNames = ['knife', 'bayonet', 'karambit']
        const isKnife = knifeNames.some(k => workingName.toLowerCase().includes(k))
        
        if (isKnife && !workingName.includes('★')) {
            variations.push(`★ ${qualityFixed}`)
        }
        
        // Remove star if present
        if (workingName.includes('★')) {
            variations.push(qualityFixed.replace('★ ', ''))
        }
        
        // StatTrak variations
        if (workingName.includes('StatTrak')) {
            const statTrakFixed = qualityFixed.replace(/StatTrak[™]?\s*/gi, 'StatTrak™ ')
            variations.push(statTrakFixed)
            
            if (isKnife && !statTrakFixed.includes('★')) {
                variations.push(`★ ${statTrakFixed}`)
            }
        }
        
        // Remove duplicates and return
        return [...new Set(variations)]
    }

    /**
     * Get prices for an item name (with Doppler support)
     */
    async getItemPrices(itemName) {
        try {
            const priceData = await this.fetchPriceData()
            
            if (!priceData || Object.keys(priceData).length === 0) {
                return { csfloatPrice: null, buffPrice: null }
            }

            // Step 1: Check if this is a Doppler item
            const dopplerInfo = this.parseDopplerItem(itemName)
            
            if (dopplerInfo.isDoppler) {
                // Generate variations for base name
                const baseVariations = this.generateNameVariations(dopplerInfo.baseName)
                
                // Try to find the base item
                for (const variation of baseVariations) {
                    const lowerVariation = variation.toLowerCase()
                    
                    if (priceData[lowerVariation]) {
                        const itemData = priceData[lowerVariation]
                        
                        // Try to get phase-specific price
                        let csfloatPrice = null
                        let buffPrice = null
                        
                        if (itemData.csfloatDoppler && itemData.csfloatDoppler[dopplerInfo.phase]) {
                            csfloatPrice = itemData.csfloatDoppler[dopplerInfo.phase]
                        } else if (itemData.csfloatPrice) {
                            csfloatPrice = itemData.csfloatPrice
                        }
                        
                        if (itemData.buffDoppler && itemData.buffDoppler[dopplerInfo.phase]) {
                            buffPrice = itemData.buffDoppler[dopplerInfo.phase]
                        } else if (itemData.buffPrice) {
                            buffPrice = itemData.buffPrice
                        }
                        
                        return { csfloatPrice, buffPrice }
                    }
                }
                
                return { csfloatPrice: null, buffPrice: null }
            }
            
            // Regular item processing
            const variations = this.generateNameVariations(itemName)
            
            for (const variation of variations) {
                const lowerVariation = variation.toLowerCase()
                
                if (priceData[lowerVariation]) {
                    return {
                        csfloatPrice: priceData[lowerVariation].csfloatPrice || null,
                        buffPrice: priceData[lowerVariation].buffPrice || null
                    }
                }
            }
            
            return { csfloatPrice: null, buffPrice: null }
            
        } catch (error) {
            console.error('❌ Error getting item prices:', error)
            return { csfloatPrice: null, buffPrice: null }
        }
    }

    /**
     * Format price for display
     */
    formatPrice(price) {
        if (!price || price <= 0) return null
        return price.toFixed(2)
    }
}

// Create singleton instance
export const priceService = new PriceService()