// ================================================================================================
// PROFESSIONAL TRADING CHART COMPONENT
// ================================================================================================
// TradingView-style chart with candlesticks, volume, and technical indicators
// Uses lightweight-charts library for professional appearance
// ================================================================================================

export class TradingChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.container = null
        this.chart = null
        this.candlestickSeries = null
        this.volumeSeries = null
        this.indicators = {}
        this.options = {
            width: 800,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            layout: {
                background: { type: 'solid', color: '#1a1a1a' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2b2b43' },
                horzLines: { color: '#363c4e' },
            },
            crosshair: {
                mode: 0, // Normal crosshair mode
            },
            rightPriceScale: {
                borderColor: '#485c7b',
            },
            timeScale: {
                borderColor: '#485c7b',
                timeVisible: true,
                secondsVisible: false,
            },
            ...options
        }
    }

    async init() {
        this.container = document.getElementById(this.containerId)
        if (!this.container) {
            console.error(`❌ Trading chart container not found: ${this.containerId}`)
            return false
        }

        try {
            // Import LightweightCharts dynamically
            const { createChart, ColorType } = await this.loadLightweightCharts()
            
            // Create main chart
            this.chart = createChart(this.container, this.options)
            
            // Create candlestick series (main price data)
            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            })

            // Create volume series (below main chart)
            this.volumeSeries = this.chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '',
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            })

            // Setup chart interactions
            this.setupChartInteractions()
            
            console.log('✅ Professional trading chart initialized')
            return true
            
        } catch (error) {
            console.error('❌ Failed to initialize trading chart:', error)
            this.showFallbackChart()
            return false
        }
    }

    async loadLightweightCharts() {
        // Try to load from CDN if not available as module
        if (typeof window.LightweightCharts !== 'undefined') {
            return window.LightweightCharts
        }
        
        // Fallback: load from CDN
        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
            script.onload = () => {
                if (window.LightweightCharts) {
                    resolve(window.LightweightCharts)
                } else {
                    reject(new Error('LightweightCharts failed to load'))
                }
            }
            script.onerror = () => reject(new Error('Failed to load LightweightCharts script'))
            document.head.appendChild(script)
        })
    }

    setupChartInteractions() {
        if (!this.chart) return

        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0) return
            const { width, height } = entries[0].contentRect
            this.chart.applyOptions({ width, height })
        })
        resizeObserver.observe(this.container)

        // Store resize observer for cleanup
        this.resizeObserver = resizeObserver
    }

    // Load CS2 skin price data
    loadSkinData(skinName, priceData = []) {
        if (!this.candlestickSeries || !this.volumeSeries) return

        // Convert price data to candlestick format
        const candlestickData = this.convertToCandlestickData(priceData)
        const volumeData = this.convertToVolumeData(priceData)

        this.candlestickSeries.setData(candlestickData)
        this.volumeSeries.setData(volumeData)

        // Add technical indicators
        this.addTechnicalIndicators(candlestickData)
    }

    convertToCandlestickData(priceData) {
        // Convert CS2 skin price data to OHLC format
        const candlesticks = []
        
        // If we have historical data, use it
        if (priceData && priceData.length > 0) {
            priceData.forEach((dataPoint, index) => {
                const time = dataPoint.timestamp || Date.now() - (priceData.length - index) * 24 * 60 * 60 * 1000
                const price = dataPoint.price || dataPoint.value || 0
                
                // Simulate OHLC from single price point (for demo purposes)
                const volatility = 0.02 // 2% volatility
                const change = (Math.random() - 0.5) * volatility * price
                
                candlesticks.push({
                    time: Math.floor(time / 1000), // LightweightCharts expects seconds
                    open: price - change * 0.5,
                    high: price + Math.abs(change) * 1.2,
                    low: price - Math.abs(change) * 1.1,
                    close: price + change * 0.5
                })
            })
        } else {
            // Generate sample data for demonstration
            candlesticks.push(...this.generateSampleData())
        }

        return candlesticks.sort((a, b) => a.time - b.time)
    }

    convertToVolumeData(priceData) {
        if (!priceData || priceData.length === 0) {
            return this.generateSampleVolumeData()
        }

        return priceData.map((dataPoint, index) => ({
            time: Math.floor((dataPoint.timestamp || Date.now() - (priceData.length - index) * 24 * 60 * 60 * 1000) / 1000),
            value: dataPoint.volume || Math.floor(Math.random() * 1000) + 100,
            color: Math.random() > 0.5 ? '#26a69a' : '#ef5350'
        }))
    }

    generateSampleData() {
        const data = []
        let price = 100 // Starting price
        const startTime = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // 30 days ago
        
        for (let i = 0; i < 30; i++) {
            const time = startTime + (i * 24 * 60 * 60)
            const change = (Math.random() - 0.5) * 10
            price += change
            
            const open = price - change * 0.5
            const close = price + change * 0.5
            const high = Math.max(open, close) + Math.random() * 5
            const low = Math.min(open, close) - Math.random() * 5
            
            data.push({ time, open: open, high, low, close })
        }
        
        return data
    }

    generateSampleVolumeData() {
        const data = []
        const startTime = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
        
        for (let i = 0; i < 30; i++) {
            const time = startTime + (i * 24 * 60 * 60)
            data.push({
                time,
                value: Math.floor(Math.random() * 1000) + 100,
                color: Math.random() > 0.5 ? '#26a69a' : '#ef5350'
            })
        }
        
        return data
    }

    addTechnicalIndicators(candlestickData) {
        if (!candlestickData || candlestickData.length < 20) return

        // Add Simple Moving Averages
        this.addSMA(candlestickData, 20, '#2196F3') // 20-day SMA in blue
        this.addSMA(candlestickData, 50, '#FF9800') // 50-day SMA in orange
    }

    addSMA(candlestickData, period, color) {
        if (candlestickData.length < period) return

        const smaData = []
        for (let i = period - 1; i < candlestickData.length; i++) {
            const sum = candlestickData.slice(i - period + 1, i + 1)
                .reduce((total, candle) => total + candle.close, 0)
            const average = sum / period
            
            smaData.push({
                time: candlestickData[i].time,
                value: average
            })
        }

        const smaSeries = this.chart.addLineSeries({
            color: color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
        })

        smaSeries.setData(smaData)
        this.indicators[`SMA${period}`] = smaSeries
    }

    // Update chart with new price data
    updatePrice(newPrice, volume = null) {
        if (!this.candlestickSeries) return

        const now = Math.floor(Date.now() / 1000)
        
        // Update candlestick (simulate update)
        this.candlestickSeries.update({
            time: now,
            open: newPrice * 0.999,
            high: newPrice * 1.001,
            low: newPrice * 0.998,
            close: newPrice
        })

        // Update volume if provided
        if (this.volumeSeries && volume) {
            this.volumeSeries.update({
                time: now,
                value: volume,
                color: Math.random() > 0.5 ? '#26a69a' : '#ef5350'
            })
        }
    }

    showFallbackChart() {
        if (!this.container) return

        this.container.innerHTML = `
            <div class="fallback-chart flex items-center justify-center h-full bg-gray-900 rounded-lg border border-gray-700">
                <div class="text-center">
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="trending-up" class="w-8 h-8 text-white"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-2">Professional Chart Loading...</h3>
                    <p class="text-gray-400 text-sm">Advanced charting will be available once libraries are loaded</p>
                    <div class="mt-4 bg-gray-800 rounded-lg p-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-300">Current Price:</span>
                            <span class="text-green-400 font-semibold">$127.45</span>
                        </div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-300">24h Change:</span>
                            <span class="text-green-400 font-semibold">+3.21%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-300">Volume:</span>
                            <span class="text-gray-300">1,247</span>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    // Cleanup method
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
        
        if (this.chart) {
            this.chart.remove()
        }

        // Clear indicators
        this.indicators = {}
    }

    // Get chart screenshot (for trade journal)
    async getScreenshot() {
        if (!this.chart) return null
        
        try {
            return await this.chart.takeScreenshot()
        } catch (error) {
            console.error('Failed to take chart screenshot:', error)
            return null
        }
    }
}