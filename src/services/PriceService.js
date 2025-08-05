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
            // Try multiple CORS proxies in order of preference
            const corsProxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://proxy.cors.sh/',
                'https://corsproxy.org/?',
                'https://yacdn.org/proxy/',
                '' // Direct fetch as last resort
            ]
            
            let csfloatData = null
            let buffData = null
            let successfulProxy = null
            
            for (const corsProxy of corsProxies) {
                try {
                    console.log(`🔄 Trying CORS proxy: ${corsProxy || 'Direct fetch'}`)
                    
                    // Prepare fetch options with appropriate headers
                    const fetchOptions = {}
                    if (corsProxy.includes('cors.sh')) {
                        fetchOptions.headers = {
                            'x-requested-with': 'XMLHttpRequest',
                            'origin': 'https://localhost:3000'
                        }
                    }
                    
                    const [csfloatResponse, buffResponse] = await Promise.all([
                        fetch(corsProxy + 'https://prices.csgotrader.app/latest/csfloat.json', fetchOptions),
                        fetch(corsProxy + 'https://prices.csgotrader.app/latest/buff163.json', fetchOptions)
                    ])

                    if (csfloatResponse.ok && buffResponse.ok) {
                        const csfloatJson = await csfloatResponse.json()
                        const buffJson = await buffResponse.json()
                        
                        // Validate that we got actual price data, not error objects
                        if (csfloatJson && !csfloatJson.error && typeof csfloatJson === 'object' && Object.keys(csfloatJson).length > 0) {
                            csfloatData = csfloatJson
                            buffData = buffJson
                            successfulProxy = corsProxy || 'Direct fetch'
                            console.log(`✅ Successfully fetched prices using: ${successfulProxy}`)
                            break
                        } else {
                            console.warn(`⚠️ Invalid data from proxy: ${corsProxy || 'Direct fetch'}`, csfloatJson)
                        }
                    }
                } catch (proxyError) {
                    console.warn(`❌ Proxy failed: ${corsProxy || 'Direct fetch'}`, proxyError.message)
                    continue
                }
            }
            
            if (!csfloatData || !buffData) {
                throw new Error('All CORS proxies failed')
            }
            
            this.priceDataCache = this.combinePriceData(csfloatData, buffData)
            this.priceCacheTimestamp = Date.now()
            this.isLoading = false
            
            console.log(`✅ Price cache updated with ${Object.keys(this.priceDataCache).length} items.`)
            return this.priceDataCache

        } catch (error) {
            console.error('❌ All price fetch attempts failed:', error.message)
            console.warn('⚠️ No price data available - API calls failed')
            this.isLoading = false
            
            // Return empty data - no fallback to hardcoded prices
            return {}
        }
    }

    /**
     * Get sample price data for demonstration (temporary solution for CORS issue)
     */
    getSamplePriceData(source) {
        // Return empty object - no hardcoded prices
        return {}
    }

    /**
     * Combine price data from both APIs (preserving doppler structure and exact names)
     */
    combinePriceData(csfloatData, buffData) {
        const combinedPrices = {}

        // Add CSFloat prices (preserve doppler structure and exact names)
        for (const [name, data] of Object.entries(csfloatData)) {
            // Store both exact name and lowercase for flexible matching
            const exactName = name
            const lowerName = name.toLowerCase()
            
            const priceData = { 
                csfloatPrice: data.price,
                csfloatDoppler: data.doppler || null,
                exactName: exactName
            }
            
            combinedPrices[exactName] = priceData
            combinedPrices[lowerName] = priceData
        }
        
        // Add Buff163 prices (preserve doppler structure and exact names)
        for (const [name, data] of Object.entries(buffData)) {
            const exactName = name
            const lowerName = name.toLowerCase()
            
            // Initialize if doesn't exist
            if (!combinedPrices[exactName]) {
                combinedPrices[exactName] = { exactName: exactName }
            }
            if (!combinedPrices[lowerName]) {
                combinedPrices[lowerName] = { exactName: exactName }
            }
            
            if (data?.starting_at?.price) {
                const buffPriceData = {
                    buffPrice: data.starting_at.price,
                    buffDoppler: data.starting_at.doppler || null
                }
                
                // Update both exact and lowercase entries
                Object.assign(combinedPrices[exactName], buffPriceData)
                Object.assign(combinedPrices[lowerName], buffPriceData)
            }
        }
        
        console.log(`📊 Combined price data for ${Object.keys(csfloatData).length} CSFloat + ${Object.keys(buffData).length} Buff163 items`)
        return combinedPrices
    }

    /**
     * Check if item is a Doppler item and extract phase/gem
     */
    parseDopplerItem(itemName) {
        const lowerName = itemName.toLowerCase()
        
        // Check if it contains "doppler" or other special patterns
        if (!lowerName.includes('doppler') && !lowerName.includes('tiger tooth') && !lowerName.includes('fade') && !lowerName.includes('marble')) {
            return { isDoppler: false }
        }
        
        // Define phase/gem patterns
        const patterns = [
            // Tiger Tooth patterns - treat as special Doppler-like case
            { 
                regex: /\|\s*tiger\s*[-\s]*tooth/i, 
                phase: 'Tiger Tooth',
                replacement: '| Tiger Tooth'
            },
            
            // Marble Fade patterns
            { 
                regex: /\|\s*marble\s+fade/i, 
                phase: 'Marble Fade',
                replacement: '| Marble Fade'
            },
            
            // Fade patterns  
            { 
                regex: /\|\s*fade\s*$/i, 
                phase: 'Fade',
                replacement: '| Fade'
            },
            
            // Gamma Doppler patterns
            { 
                regex: /\|\s*gamma\s+doppler\s*[-\s]*sapphire/i, 
                phase: 'Sapphire',
                replacement: '| Gamma Doppler'
            },
            { 
                regex: /\|\s*gamma\s+doppler\s*[-\s]*ruby/i, 
                phase: 'Ruby',
                replacement: '| Gamma Doppler'
            },
            { 
                regex: /\|\s*gamma\s+doppler\s*[-\s]*emerald/i, 
                phase: 'Emerald',
                replacement: '| Gamma Doppler'
            },
            { 
                regex: /\|\s*gamma\s+doppler\s*[-\s]*phase\s+([1-4])/i, 
                phase: 'Phase',
                replacement: '| Gamma Doppler'
            },
            
            // Regular Doppler patterns
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
     * Generate comprehensive name variations for matching
     */
    generateNameVariations(itemName) {
        const variations = []
        let workingName = itemName.trim()
        
        // Original name
        variations.push(workingName)
        
        // Comprehensive condition mapping (both directions)
        const conditionMap = {
            'Factory New': ['FN', 'Factory-New'],
            'Minimal Wear': ['MW', 'Minimal-Wear'],
            'Field-Tested': ['FT', 'Field-Tested'],
            'Well-Worn': ['WW', 'Well-Worn'],
            'Battle-Scarred': ['BS', 'Battle-Scarred']
        }
        
        // Create all condition variations
        const conditionVariations = [workingName]
        
        for (const [fullName, abbreviations] of Object.entries(conditionMap)) {
            // Convert full name to abbreviations
            if (workingName.includes(`(${fullName})`)) {
                abbreviations.forEach(abbrev => {
                    conditionVariations.push(workingName.replace(`(${fullName})`, `(${abbrev})`))
                })
            }
            
            // Convert abbreviations to full name
            abbreviations.forEach(abbrev => {
                if (workingName.includes(`(${abbrev})`)) {
                    conditionVariations.push(workingName.replace(`(${abbrev})`, `(${fullName})`))
                    // Also try with hyphens
                    const hyphenated = fullName.replace(' ', '-')
                    conditionVariations.push(workingName.replace(`(${abbrev})`, `(${hyphenated})`))
                }
            })
            
            // Handle hyphenated conditions
            if (workingName.includes(`(${fullName.replace(' ', '-')})`)) {
                conditionVariations.push(workingName.replace(`(${fullName.replace(' ', '-')})`, `(${fullName})`))
                abbreviations.forEach(abbrev => {
                    conditionVariations.push(workingName.replace(`(${fullName.replace(' ', '-')})`, `(${abbrev})`))
                })
            }
        }
        
        // Add all condition variations to main variations
        variations.push(...conditionVariations)
        
        // Comprehensive knife name mapping
        const knifePatterns = [
            'bayonet', 'karambit', 'butterfly', 'bowie', 'falchion', 'flip', 'gut', 'huntsman',
            'shadow daggers', 'navaja', 'stiletto', 'talon', 'ursus', 'classic', 'paracord',
            'survival', 'nomad', 'skeleton', 'kukri'
        ]
        
        const isKnife = knifePatterns.some(pattern => workingName.toLowerCase().includes(pattern))
        
        // Create knife variations (with and without star)
        const allVariationsToProcess = [...variations]
        allVariationsToProcess.forEach(variation => {
            if (isKnife) {
                if (!variation.includes('★')) {
                    variations.push(`★ ${variation}`)
                }
                if (variation.includes('★')) {
                    variations.push(variation.replace('★ ', ''))
                }
            }
        })
        
        // Handle special patterns (Tiger Tooth, Fade, etc.)
        const patternVariations = []
        allVariationsToProcess.forEach(variation => {
            // Tiger Tooth variations
            if (variation.toLowerCase().includes('tiger tooth')) {
                patternVariations.push(variation.replace(/tiger tooth/gi, 'Tiger Tooth'))
                patternVariations.push(variation.replace(/tiger tooth/gi, 'tiger tooth'))
                patternVariations.push(variation.replace(/tiger tooth/gi, 'Tiger-Tooth'))
            }
            
            // Fade variations
            if (variation.toLowerCase().includes('fade')) {
                patternVariations.push(variation.replace(/fade/gi, 'Fade'))
                patternVariations.push(variation.replace(/fade/gi, 'fade'))
            }
            
            // Marble Fade variations
            if (variation.toLowerCase().includes('marble fade')) {
                patternVariations.push(variation.replace(/marble fade/gi, 'Marble Fade'))
                patternVariations.push(variation.replace(/marble fade/gi, 'marble fade'))
                patternVariations.push(variation.replace(/marble fade/gi, 'Marble-Fade'))
            }
            
            // Slaughter variations
            if (variation.toLowerCase().includes('slaughter')) {
                patternVariations.push(variation.replace(/slaughter/gi, 'Slaughter'))
                patternVariations.push(variation.replace(/slaughter/gi, 'slaughter'))
            }
            
            // Case Hardened variations
            if (variation.toLowerCase().includes('case hardened')) {
                patternVariations.push(variation.replace(/case hardened/gi, 'Case Hardened'))
                patternVariations.push(variation.replace(/case hardened/gi, 'case hardened'))
                patternVariations.push(variation.replace(/case hardened/gi, 'Case-Hardened'))
            }
            
            // Crimson Web variations
            if (variation.toLowerCase().includes('crimson web')) {
                patternVariations.push(variation.replace(/crimson web/gi, 'Crimson Web'))
                patternVariations.push(variation.replace(/crimson web/gi, 'crimson web'))
                patternVariations.push(variation.replace(/crimson web/gi, 'Crimson-Web'))
            }
            
            // Night variations
            if (variation.toLowerCase().includes(' night')) {
                patternVariations.push(variation.replace(/ night/gi, ' Night'))
                patternVariations.push(variation.replace(/ night/gi, ' night'))
            }
            
            // Urban Masked variations
            if (variation.toLowerCase().includes('urban masked')) {
                patternVariations.push(variation.replace(/urban masked/gi, 'Urban Masked'))
                patternVariations.push(variation.replace(/urban masked/gi, 'urban masked'))
                patternVariations.push(variation.replace(/urban masked/gi, 'Urban-Masked'))
            }
        })
        
        variations.push(...patternVariations)
        
        // StatTrak variations - comprehensive handling
        if (workingName.toLowerCase().includes('stattrak')) {
            const statTrakVariations = []
            const baseVariations = [...variations]
            
            baseVariations.forEach(variation => {
                // Multiple StatTrak formats
                const statTrakFormats = ['StatTrak™', 'StatTrak', 'Stattrak™', 'Stattrak', 'ST™', 'ST']
                
                statTrakFormats.forEach(format => {
                    if (variation.toLowerCase().includes('stattrak')) {
                        const newVariation = variation.replace(/StatTrak[™]?\s*/gi, `${format} `)
                        statTrakVariations.push(newVariation)
                    }
                })
            })
            
            variations.push(...statTrakVariations)
        }
        
        // Handle spacing variations
        const spacingVariations = []
        variations.forEach(variation => {
            // Handle different spacing around |
            if (variation.includes('|')) {
                spacingVariations.push(variation.replace(/\s*\|\s*/g, ' | '))
                spacingVariations.push(variation.replace(/\s*\|\s*/g, '|'))
                spacingVariations.push(variation.replace(/\s*\|\s*/g, ' |'))
                spacingVariations.push(variation.replace(/\s*\|\s*/g, '| '))
            }
            
            // Handle double spaces
            spacingVariations.push(variation.replace(/\s+/g, ' '))
        })
        
        variations.push(...spacingVariations)
        
        // Remove duplicates and empty strings, return sorted by specificity
        const uniqueVariations = [...new Set(variations.filter(v => v && v.trim()))]
        
        // Sort variations: exact matches first, then by length (longer = more specific)
        return uniqueVariations.sort((a, b) => {
            if (a === workingName) return -1
            if (b === workingName) return 1
            return b.length - a.length
        })
    }

    /**
     * Get prices for an item name (with Doppler support)
     */
    async getItemPrices(itemName) {
        try {
            const priceData = await this.fetchPriceData()
            
            if (!priceData || Object.keys(priceData).length === 0) {
                console.warn(`❌ No price data available for: "${itemName}"`)
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
                        
                        console.log(`✅ Found Doppler match for "${itemName}": CSFloat $${csfloatPrice}, Buff $${buffPrice}`)
                        return { csfloatPrice, buffPrice }
                    }
                }
                
                console.log(`❌ No Doppler match found for: "${itemName}"`)
                return { csfloatPrice: null, buffPrice: null }
            }
            
            // Regular item processing - try exact match first, then variations
            console.log(`🔍 Looking for prices for: "${itemName}"`)
            
            // Try exact match first (case-sensitive)
            if (priceData[itemName]) {
                const result = {
                    csfloatPrice: priceData[itemName].csfloatPrice || null,
                    buffPrice: priceData[itemName].buffPrice || null
                }
                console.log(`✅ Found exact match for "${itemName}": CSFloat $${result.csfloatPrice}, Buff $${result.buffPrice}`)
                return result
            }
            
            // Try lowercase exact match
            const lowerItemName = itemName.toLowerCase()
            if (priceData[lowerItemName]) {
                const result = {
                    csfloatPrice: priceData[lowerItemName].csfloatPrice || null,
                    buffPrice: priceData[lowerItemName].buffPrice || null
                }
                console.log(`✅ Found lowercase match for "${itemName}": CSFloat $${result.csfloatPrice}, Buff $${result.buffPrice}`)
                return result
            }
            
            // Try variations as fallback
            const variations = this.generateNameVariations(itemName)
            console.log(`🔄 Trying ${variations.length} variations for: "${itemName}"`, variations)
            
            for (const variation of variations) {
                // Try exact variation first
                if (priceData[variation]) {
                    const result = {
                        csfloatPrice: priceData[variation].csfloatPrice || null,
                        buffPrice: priceData[variation].buffPrice || null
                    }
                    console.log(`✅ Found variation match: "${variation}" for "${itemName}": CSFloat $${result.csfloatPrice}, Buff $${result.buffPrice}`)
                    return result
                }
                
                // Try lowercase variation
                const lowerVariation = variation.toLowerCase()
                if (priceData[lowerVariation]) {
                    const result = {
                        csfloatPrice: priceData[lowerVariation].csfloatPrice || null,
                        buffPrice: priceData[lowerVariation].buffPrice || null
                    }
                    console.log(`✅ Found lowercase variation match: "${lowerVariation}" for "${itemName}": CSFloat $${result.csfloatPrice}, Buff $${result.buffPrice}`)
                    return result
                }
            }
            
            console.log(`❌ No price match found for: "${itemName}"`)
            console.log(`📋 Available similar items:`, Object.keys(priceData).filter(key => 
                key.toLowerCase().includes(itemName.toLowerCase().split(' ')[0]) || 
                key.toLowerCase().includes('butterfly') ||
                key.toLowerCase().includes('lore')
            ).slice(0, 10))
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

    /**
     * Test CORS proxies to see which ones work
     */
    async testCorsProxies() {
        const corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/',
            '' // Direct fetch
        ]
        
        console.log('🧪 Testing CORS proxies...')
        
        for (const corsProxy of corsProxies) {
            try {
                const proxyName = corsProxy || 'Direct fetch'
                console.log(`Testing: ${proxyName}`)
                
                const response = await fetch(corsProxy + 'https://prices.csgotrader.app/latest/csfloat.json')
                
                if (response.ok) {
                    const data = await response.json()
                    if (data && !data.error && typeof data === 'object') {
                        console.log(`✅ ${proxyName} - Working (${Object.keys(data).length} items)`)
                    } else {
                        console.log(`❌ ${proxyName} - Invalid data:`, data)
                    }
                } else {
                    console.log(`❌ ${proxyName} - HTTP ${response.status}`)
                }
            } catch (error) {
                console.log(`❌ ${corsProxy || 'Direct fetch'} - Error:`, error.message)
            }
        }
        
        console.log('🧪 CORS proxy testing complete')
    }

    /**
     * Debug method to show available items in cache
     */
    debugShowAvailableItems(searchTerm = '') {
        if (!this.priceDataCache) {
            console.log('No price cache available')
            return
        }
        
        const items = Object.keys(this.priceDataCache)
            .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 20) // Show first 20 matches
            
        console.log(`📋 Available items in cache (showing ${items.length} matching "${searchTerm}"):`)
        items.forEach(item => {
            const data = this.priceDataCache[item]
            console.log(`  "${item}" - CSFloat: $${data.csfloatPrice || 'N/A'}, Buff: $${data.buffPrice || 'N/A'}`)
        })
    }
}

// Create singleton instance
export const priceService = new PriceService()