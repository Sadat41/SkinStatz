// ================================================================================================
// MARKET HEATMAP COMPONENT
// ================================================================================================
// Visual representation of CS2 skin market performance with color-coded cells
// Shows performance by category, price range, or individual skins
// ================================================================================================

export class MarketHeatmap {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.container = null
        this.options = {
            width: 800,
            height: 400,
            colorScheme: {
                positive: ['#26a69a', '#4caf50', '#8bc34a'],
                negative: ['#ef5350', '#f44336', '#d32f2f'],
                neutral: '#37474f'
            },
            showLabels: true,
            showTooltips: true,
            margin: { top: 20, right: 20, bottom: 20, left: 20 },
            ...options
        }
        this.data = []
        this.tooltip = null
    }

    async init() {
        this.container = document.getElementById(this.containerId)
        if (!this.container) {
            console.error(`❌ Heatmap container not found: ${this.containerId}`)
            return false
        }

        try {
            // Create heatmap structure
            this.setupHeatmapStructure()
            this.createTooltip()
            console.log('✅ Market heatmap initialized')
            return true
        } catch (error) {
            console.error('❌ Failed to initialize market heatmap:', error)
            this.showFallbackHeatmap()
            return false
        }
    }

    setupHeatmapStructure() {
        this.container.innerHTML = `
            <div class="market-heatmap bg-gray-900 rounded-lg p-4" style="width: 100%; height: 100%;">
                <div class="heatmap-header flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-white">CS2 Market Performance</h3>
                    <div class="heatmap-controls flex gap-2">
                        <select class="heatmap-timeframe bg-gray-800 text-white px-3 py-1 rounded border border-gray-600">
                            <option value="1d">24H</option>
                            <option value="7d">7D</option>
                            <option value="30d">30D</option>
                        </select>
                        <select class="heatmap-view bg-gray-800 text-white px-3 py-1 rounded border border-gray-600">
                            <option value="category">By Category</option>
                            <option value="price-range">By Price Range</option>
                            <option value="top-skins">Top Skins</option>
                        </select>
                    </div>
                </div>
                <div class="heatmap-grid" id="heatmap-grid"></div>
                <div class="heatmap-legend flex justify-center items-center mt-4 gap-4">
                    <span class="text-sm text-gray-400">Performance:</span>
                    <div class="legend-gradient flex items-center gap-1">
                        <div class="w-4 h-4 bg-red-500 rounded"></div>
                        <span class="text-xs text-gray-400">-10%</span>
                        <div class="w-16 h-4 bg-gradient-to-r from-red-500 via-gray-600 to-green-500 rounded mx-2"></div>
                        <span class="text-xs text-gray-400">+10%</span>
                        <div class="w-4 h-4 bg-green-500 rounded"></div>
                    </div>
                </div>
            </div>
        `

        // Setup event listeners
        this.setupEventListeners()
    }

    setupEventListeners() {
        const timeframeSelect = this.container.querySelector('.heatmap-timeframe')
        const viewSelect = this.container.querySelector('.heatmap-view')

        timeframeSelect?.addEventListener('change', (e) => {
            this.updateTimeframe(e.target.value)
        })

        viewSelect?.addEventListener('change', (e) => {
            this.updateView(e.target.value)
        })
    }

    createTooltip() {
        this.tooltip = document.createElement('div')
        this.tooltip.className = 'heatmap-tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg border border-gray-600 text-sm z-50 pointer-events-none opacity-0 transition-opacity duration-200'
        document.body.appendChild(this.tooltip)
    }

    // Load market data and render heatmap
    loadMarketData(marketData = []) {
        this.data = marketData.length > 0 ? marketData : this.generateSampleData()
        this.renderHeatmap()
    }

    generateSampleData() {
        const categories = [
            { name: 'AK-47 Skins', count: 45, avgChange: 2.3, value: 1250000, category: 'rifles' },
            { name: 'M4A4 Skins', count: 38, avgChange: -1.1, value: 980000, category: 'rifles' },
            { name: 'AWP Skins', count: 52, avgChange: 4.7, value: 2100000, category: 'rifles' },
            { name: 'Glock Skins', count: 23, avgChange: 0.8, value: 340000, category: 'pistols' },
            { name: 'USP-S Skins', count: 19, avgChange: -0.5, value: 280000, category: 'pistols' },
            { name: 'Desert Eagle', count: 31, avgChange: 3.2, value: 750000, category: 'pistols' },
            { name: 'Karambit Knives', count: 12, avgChange: 8.1, value: 3200000, category: 'knives' },
            { name: 'Butterfly Knives', count: 8, avgChange: 6.4, value: 2800000, category: 'knives' },
            { name: 'Bayonet Knives', count: 15, avgChange: 2.9, value: 1900000, category: 'knives' },
            { name: 'Weapon Cases', count: 78, avgChange: -2.1, value: 450000, category: 'cases' },
            { name: 'Sticker Capsules', count: 34, avgChange: 1.4, value: 220000, category: 'cases' },
            { name: 'Gloves', count: 16, avgChange: 5.2, value: 1600000, category: 'gloves' }
        ]

        return categories
    }

    renderHeatmap() {
        const grid = this.container.querySelector('#heatmap-grid')
        if (!grid) return

        // Calculate grid dimensions
        const itemsPerRow = Math.ceil(Math.sqrt(this.data.length))
        const cellSize = Math.min(80, (grid.offsetWidth - 40) / itemsPerRow)

        grid.innerHTML = ''
        grid.style.display = 'grid'
        grid.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${cellSize}px)`
        grid.style.gap = '2px'
        grid.style.justifyContent = 'center'

        this.data.forEach(item => {
            const cell = this.createHeatmapCell(item, cellSize)
            grid.appendChild(cell)
        })
    }

    createHeatmapCell(item, size) {
        const cell = document.createElement('div')
        const changePercent = item.avgChange || 0
        const backgroundColor = this.getColorForChange(changePercent)
        
        cell.className = 'heatmap-cell relative rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10'
        cell.style.width = `${size}px`
        cell.style.height = `${size}px`
        cell.style.backgroundColor = backgroundColor
        cell.style.border = '1px solid rgba(255,255,255,0.1)'

        cell.innerHTML = `
            <div class="absolute inset-0 flex flex-col justify-center items-center p-1 text-center">
                <div class="text-xs font-semibold text-white truncate w-full" title="${item.name}">
                    ${this.truncateName(item.name)}
                </div>
                <div class="text-xs font-bold ${changePercent >= 0 ? 'text-green-200' : 'text-red-200'}">
                    ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%
                </div>
                <div class="text-xs text-gray-200 opacity-80">
                    ${item.count || 0}
                </div>
            </div>
        `

        // Add hover effects
        cell.addEventListener('mouseenter', (e) => {
            this.showTooltip(e, item)
        })

        cell.addEventListener('mouseleave', () => {
            this.hideTooltip()
        })

        cell.addEventListener('mousemove', (e) => {
            this.updateTooltipPosition(e)
        })

        return cell
    }

    truncateName(name) {
        if (name.length <= 8) return name
        return name.substring(0, 6) + '..'
    }

    getColorForChange(changePercent) {
        const maxChange = 10 // ±10% for full color intensity
        const intensity = Math.min(Math.abs(changePercent) / maxChange, 1)
        
        if (changePercent > 0) {
            // Positive change - green
            const greenIntensity = Math.floor(intensity * 255)
            return `rgba(76, 175, 80, ${0.3 + intensity * 0.7})`
        } else if (changePercent < 0) {
            // Negative change - red  
            const redIntensity = Math.floor(intensity * 255)
            return `rgba(244, 67, 54, ${0.3 + intensity * 0.7})`
        } else {
            // No change - neutral
            return 'rgba(96, 125, 139, 0.5)'
        }
    }

    showTooltip(event, item) {
        if (!this.tooltip) return

        const formatValue = (value) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value / 100) // Assuming value is in cents
        }

        this.tooltip.innerHTML = `
            <div class="font-semibold text-white mb-1">${item.name}</div>
            <div class="text-sm text-gray-300 mb-1">Items: ${item.count || 0}</div>
            <div class="text-sm text-gray-300 mb-1">Market Value: ${formatValue(item.value || 0)}</div>
            <div class="text-sm ${item.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}">
                Change: ${item.avgChange >= 0 ? '+' : ''}${(item.avgChange || 0).toFixed(2)}%
            </div>
            <div class="text-xs text-gray-400 mt-1 capitalize">Category: ${item.category || 'Unknown'}</div>
        `

        this.tooltip.style.opacity = '1'
        this.updateTooltipPosition(event)
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0'
        }
    }

    updateTooltipPosition(event) {
        if (!this.tooltip) return

        const x = event.pageX + 10
        const y = event.pageY - 10

        // Keep tooltip within viewport
        const rect = this.tooltip.getBoundingClientRect()
        const maxX = window.innerWidth - rect.width - 10
        const maxY = window.innerHeight - rect.height - 10

        this.tooltip.style.left = `${Math.min(x, maxX)}px`
        this.tooltip.style.top = `${Math.min(y, maxY)}px`
    }

    updateTimeframe(timeframe) {
        console.log(`🕒 Updating heatmap timeframe to: ${timeframe}`)
        // Simulate data update based on timeframe
        this.simulateDataUpdate(timeframe)
    }

    updateView(view) {
        console.log(`👁️ Updating heatmap view to: ${view}`)
        
        switch (view) {
            case 'category':
                this.data = this.generateSampleData()
                break
            case 'price-range':
                this.data = this.generatePriceRangeData()
                break
            case 'top-skins':
                this.data = this.generateTopSkinsData()
                break
        }
        
        this.renderHeatmap()
    }

    generatePriceRangeData() {
        return [
            { name: '$0-10', count: 2341, avgChange: 0.8, value: 15600000, category: 'budget' },
            { name: '$10-50', count: 1876, avgChange: 1.4, value: 42300000, category: 'low' },
            { name: '$50-100', count: 934, avgChange: 2.1, value: 71200000, category: 'mid' },
            { name: '$100-500', count: 456, avgChange: 3.2, value: 128900000, category: 'high' },
            { name: '$500-1K', count: 187, avgChange: 4.8, value: 134700000, category: 'premium' },
            { name: '$1K-5K', count: 89, avgChange: 6.2, value: 267800000, category: 'luxury' },
            { name: '$5K+', count: 23, avgChange: 8.9, value: 187300000, category: 'exclusive' }
        ]
    }

    generateTopSkinsData() {
        return [
            { name: 'AK Redline', count: 12, avgChange: 4.2, value: 45000, category: 'rifles' },
            { name: 'AWP Asiimov', count: 3, avgChange: 6.8, value: 120000, category: 'rifles' },
            { name: 'Karambit Doppler', count: 1, avgChange: 8.3, value: 380000, category: 'knives' },
            { name: 'M4A4 Neo-Noir', count: 2, avgChange: 3.7, value: 20000, category: 'rifles' },
            { name: 'Glock Fade', count: 8, avgChange: 3.1, value: 28000, category: 'pistols' }
        ]
    }

    simulateDataUpdate(timeframe) {
        // Simulate different performance based on timeframe
        const multipliers = {
            '1d': 1,
            '7d': 2.5,
            '30d': 4.2
        }

        const multiplier = multipliers[timeframe] || 1
        
        this.data = this.data.map(item => ({
            ...item,
            avgChange: (item.avgChange || 0) * multiplier * (0.8 + Math.random() * 0.4)
        }))

        this.renderHeatmap()
    }

    showFallbackHeatmap() {
        if (!this.container) return

        this.container.innerHTML = `
            <div class="fallback-heatmap bg-gray-900 rounded-lg p-6">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="grid-3x3" class="w-8 h-8 text-white"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-2">Market Heatmap</h3>
                    <p class="text-gray-400 text-sm">Visual market performance overview</p>
                </div>
                
                <div class="grid grid-cols-4 gap-2 mb-4">
                    <div class="bg-green-500 bg-opacity-70 p-3 rounded text-center">
                        <div class="text-white font-semibold text-sm">Rifles</div>
                        <div class="text-green-200 text-xs">+2.3%</div>
                    </div>
                    <div class="bg-red-500 bg-opacity-70 p-3 rounded text-center">
                        <div class="text-white font-semibold text-sm">Pistols</div>
                        <div class="text-red-200 text-xs">-1.1%</div>
                    </div>
                    <div class="bg-green-600 bg-opacity-70 p-3 rounded text-center">
                        <div class="text-white font-semibold text-sm">Knives</div>
                        <div class="text-green-200 text-xs">+5.7%</div>
                    </div>
                    <div class="bg-gray-600 bg-opacity-70 p-3 rounded text-center">
                        <div class="text-white font-semibold text-sm">Cases</div>
                        <div class="text-gray-200 text-xs">0.0%</div>
                    </div>
                </div>
                
                <div class="text-center text-gray-400 text-sm">
                    Enhanced heatmap loading...
                </div>
            </div>
        `
    }

    // Cleanup method
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip)
        }
    }
}