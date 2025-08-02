// ================================================================================================
// WATERFALL CHART COMPONENT
// ================================================================================================
// Professional waterfall chart for P&L analysis and performance attribution
// Shows how individual trades and categories contribute to overall performance
// ================================================================================================

export class WaterfallChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.container = null
        this.chart = null
        this.options = {
            width: 800,
            height: 400,
            margin: { top: 20, right: 30, bottom: 40, left: 60 },
            colors: {
                positive: '#26a69a',
                negative: '#ef5350',
                total: '#2196F3',
                connector: '#666'
            },
            showConnectors: true,
            showValues: true,
            animated: true,
            ...options
        }
        this.data = []
    }

    async init() {
        this.container = document.getElementById(this.containerId)
        if (!this.container) {
            console.error(`❌ Waterfall chart container not found: ${this.containerId}`)
            return false
        }

        try {
            await this.loadD3()
            this.setupChart()
            console.log('✅ Waterfall chart initialized')
            return true
        } catch (error) {
            console.error('❌ Failed to initialize waterfall chart:', error)
            this.showFallbackChart()
            return false
        }
    }

    async loadD3() {
        if (typeof window.d3 !== 'undefined') {
            this.d3 = window.d3
            return
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://d3js.org/d3.v7.min.js'
            script.onload = () => {
                if (window.d3) {
                    this.d3 = window.d3
                    resolve()
                } else {
                    reject(new Error('D3 failed to load'))
                }
            }
            script.onerror = () => reject(new Error('Failed to load D3 script'))
            document.head.appendChild(script)
        })
    }

    setupChart() {
        // Clear container
        this.container.innerHTML = `
            <div class="waterfall-chart bg-gray-900 rounded-lg p-4">
                <div class="waterfall-header flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-white">P&L Waterfall Analysis</h3>
                    <div class="waterfall-controls flex gap-2">
                        <select class="waterfall-period bg-gray-800 text-white px-3 py-1 rounded border border-gray-600">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                        <select class="waterfall-type bg-gray-800 text-white px-3 py-1 rounded border border-gray-600">
                            <option value="category">By Category</option>
                            <option value="trade">By Trade</option>
                            <option value="timeline">Timeline</option>
                        </select>
                    </div>
                </div>
                <div class="waterfall-svg-container" style="width: 100%; height: ${this.options.height}px;">
                    <svg id="waterfall-svg" width="100%" height="100%"></svg>
                </div>
                <div class="waterfall-summary grid grid-cols-3 gap-4 mt-4">
                    <div class="bg-gray-800 rounded-lg p-3 text-center">
                        <div class="text-green-400 font-bold text-lg" id="total-gains">$0</div>
                        <div class="text-gray-400 text-sm">Total Gains</div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 text-center">
                        <div class="text-red-400 font-bold text-lg" id="total-losses">$0</div>
                        <div class="text-gray-400 text-sm">Total Losses</div>
                    </div>
                    <div class="bg-gray-800 rounded-lg p-3 text-center">
                        <div class="text-blue-400 font-bold text-lg" id="net-result">$0</div>
                        <div class="text-gray-400 text-sm">Net Result</div>
                    </div>
                </div>
            </div>
        `

        // Setup event listeners
        this.setupEventListeners()
        
        // Initialize SVG
        this.svg = this.d3.select('#waterfall-svg')
        this.width = this.container.offsetWidth - this.options.margin.left - this.options.margin.right
        this.height = this.options.height - this.options.margin.top - this.options.margin.bottom

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.options.margin.left},${this.options.margin.top})`)
    }

    setupEventListeners() {
        const periodSelect = this.container.querySelector('.waterfall-period')
        const typeSelect = this.container.querySelector('.waterfall-type')

        periodSelect?.addEventListener('change', (e) => {
            this.updatePeriod(e.target.value)
        })

        typeSelect?.addEventListener('change', (e) => {
            this.updateType(e.target.value)
        })
    }

    // Load trading data and create waterfall
    loadTradingData(trades = []) {
        if (trades.length === 0) {
            trades = this.generateSampleData()
        }

        this.processTradeData(trades)
        this.renderChart()
        this.updateSummary()
    }

    generateSampleData() {
        return [
            { category: 'AK-47 Trades', profit: 450, count: 12, avgReturn: 3.2 },
            { category: 'AWP Trades', profit: 1200, count: 8, avgReturn: 8.7 },
            { category: 'Knife Trades', profit: -300, count: 3, avgReturn: -4.1 },
            { category: 'Pistol Trades', profit: 180, count: 15, avgReturn: 1.8 },
            { category: 'Case Investments', profit: -120, count: 25, avgReturn: -0.8 },
            { category: 'Glove Trades', profit: 780, count: 4, avgReturn: 12.3 },
            { category: 'Sticker Flips', profit: 95, count: 18, avgReturn: 2.1 }
        ]
    }

    processTradeData(trades) {
        // Process trades into waterfall data structure
        let runningTotal = 0
        this.data = []

        // Starting point (optional - could be account balance)
        const startingBalance = 1000
        this.data.push({
            name: 'Starting Balance',
            value: startingBalance,
            cumulative: startingBalance,
            type: 'start',
            color: this.options.colors.total
        })
        runningTotal = startingBalance

        // Add each category/trade
        trades.forEach((trade, index) => {
            const value = trade.profit || trade.value || 0
            runningTotal += value
            
            this.data.push({
                name: trade.category || trade.name || `Trade ${index + 1}`,
                value: value,
                cumulative: runningTotal,
                type: value >= 0 ? 'positive' : 'negative',
                color: value >= 0 ? this.options.colors.positive : this.options.colors.negative,
                count: trade.count || 1,
                avgReturn: trade.avgReturn || 0
            })
        })

        // Final total
        this.data.push({
            name: 'Net Result',
            value: runningTotal - startingBalance,
            cumulative: runningTotal,
            type: 'total',
            color: this.options.colors.total
        })
    }

    renderChart() {
        if (!this.chartGroup || !this.data.length) return

        // Clear previous chart
        this.chartGroup.selectAll('*').remove()

        // Setup scales
        const xScale = this.d3.scaleBand()
            .domain(this.data.map(d => d.name))
            .range([0, this.width])
            .padding(0.2)

        const maxValue = this.d3.max(this.data, d => Math.max(d.cumulative, d.cumulative - d.value))
        const minValue = this.d3.min(this.data, d => Math.min(d.cumulative, d.cumulative - d.value))
        const yScale = this.d3.scaleLinear()
            .domain([minValue * 0.9, maxValue * 1.1])
            .range([this.height, 0])

        // Add axes
        this.addAxes(xScale, yScale)

        // Add bars
        this.addBars(xScale, yScale)

        // Add connectors
        if (this.options.showConnectors) {
            this.addConnectors(xScale, yScale)
        }

        // Add value labels
        if (this.options.showValues) {
            this.addValueLabels(xScale, yScale)
        }

        // Add tooltips
        this.addTooltips()
    }

    addAxes(xScale, yScale) {
        // X-axis
        this.chartGroup.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(this.d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', '#d1d4dc')
            .style('font-size', '12px')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')

        // Y-axis
        this.chartGroup.append('g')
            .call(this.d3.axisLeft(yScale).tickFormat(d => `$${d}`))
            .selectAll('text')
            .style('fill', '#d1d4dc')
            .style('font-size', '12px')

        // Grid lines
        this.chartGroup.append('g')
            .attr('class', 'grid')
            .call(this.d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
            )
            .selectAll('line')
            .style('stroke', '#2b2b43')
            .style('stroke-width', 1)
    }

    addBars(xScale, yScale) {
        const bars = this.chartGroup.selectAll('.waterfall-bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'waterfall-bar')
            .attr('x', d => xScale(d.name))
            .attr('width', xScale.bandwidth())
            .attr('fill', d => d.color)
            .attr('stroke', 'rgba(255,255,255,0.1)')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')

        if (this.options.animated) {
            bars.attr('y', this.height)
                .attr('height', 0)
                .transition()
                .duration(1000)
                .delay((d, i) => i * 100)
                .attr('y', d => {
                    if (d.type === 'start' || d.type === 'total') {
                        return yScale(Math.max(0, d.cumulative))
                    }
                    return yScale(Math.max(d.cumulative, d.cumulative - d.value))
                })
                .attr('height', d => {
                    if (d.type === 'start' || d.type === 'total') {
                        return Math.abs(yScale(d.cumulative) - yScale(0))
                    }
                    return Math.abs(yScale(d.cumulative) - yScale(d.cumulative - d.value))
                })
        } else {
            bars.attr('y', d => {
                    if (d.type === 'start' || d.type === 'total') {
                        return yScale(Math.max(0, d.cumulative))
                    }
                    return yScale(Math.max(d.cumulative, d.cumulative - d.value))
                })
                .attr('height', d => {
                    if (d.type === 'start' || d.type === 'total') {
                        return Math.abs(yScale(d.cumulative) - yScale(0))
                    }
                    return Math.abs(yScale(d.cumulative) - yScale(d.cumulative - d.value))
                })
        }
    }

    addConnectors(xScale, yScale) {
        for (let i = 0; i < this.data.length - 1; i++) {
            const current = this.data[i]
            const next = this.data[i + 1]

            this.chartGroup.append('line')
                .attr('class', 'connector')
                .attr('x1', xScale(current.name) + xScale.bandwidth())
                .attr('y1', yScale(current.cumulative))
                .attr('x2', xScale(next.name))
                .attr('y2', yScale(current.cumulative))
                .style('stroke', this.options.colors.connector)
                .style('stroke-width', 1)
                .style('stroke-dasharray', '3,3')
        }
    }

    addValueLabels(xScale, yScale) {
        this.chartGroup.selectAll('.value-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
            .attr('y', d => {
                const barTop = d.type === 'start' || d.type === 'total' ? 
                    yScale(Math.max(0, d.cumulative)) : 
                    yScale(Math.max(d.cumulative, d.cumulative - d.value))
                return barTop - 5
            })
            .attr('text-anchor', 'middle')
            .style('fill', '#d1d4dc')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .text(d => {
                if (d.type === 'start') return `$${d.value}`
                return d.value >= 0 ? `+$${d.value}` : `-$${Math.abs(d.value)}`
            })
    }

    addTooltips() {
        // Create tooltip
        const tooltip = this.d3.select('body').append('div')
            .attr('class', 'waterfall-tooltip')
            .style('position', 'absolute')
            .style('background', '#1f2937')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('border', '1px solid #374151')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000)

        this.chartGroup.selectAll('.waterfall-bar')
            .on('mouseover', (event, d) => {
                tooltip.transition().duration(200).style('opacity', 1)
                tooltip.html(`
                    <div class="font-semibold mb-1">${d.name}</div>
                    <div>Value: <span class="${d.value >= 0 ? 'text-green-400' : 'text-red-400'}">${d.value >= 0 ? '+' : ''}$${d.value}</span></div>
                    <div>Cumulative: $${d.cumulative}</div>
                    ${d.count ? `<div>Trades: ${d.count}</div>` : ''}
                    ${d.avgReturn ? `<div>Avg Return: ${d.avgReturn}%</div>` : ''}
                `)
            })
            .on('mousemove', (event) => {
                tooltip.style('left', (event.pageX + 10) + 'px')
                       .style('top', (event.pageY - 10) + 'px')
            })
            .on('mouseout', () => {
                tooltip.transition().duration(200).style('opacity', 0)
            })
    }

    updateSummary() {
        const totalGains = this.data.reduce((sum, d) => sum + (d.value > 0 ? d.value : 0), 0)
        const totalLosses = Math.abs(this.data.reduce((sum, d) => sum + (d.value < 0 ? d.value : 0), 0))
        const netResult = totalGains - totalLosses

        document.getElementById('total-gains').textContent = `$${totalGains}`
        document.getElementById('total-losses').textContent = `$${totalLosses}`
        document.getElementById('net-result').textContent = `$${netResult}`
        document.getElementById('net-result').className = `font-bold text-lg ${netResult >= 0 ? 'text-green-400' : 'text-red-400'}`
    }

    updatePeriod(period) {
        console.log(`📅 Updating waterfall period to: ${period}`)
        // Regenerate data based on period
        this.loadTradingData()
    }

    updateType(type) {
        console.log(`📊 Updating waterfall type to: ${type}`)
        
        switch (type) {
            case 'category':
                this.loadTradingData(this.generateSampleData())
                break
            case 'trade':
                this.loadTradingData(this.generateTradeData())
                break
            case 'timeline':
                this.loadTradingData(this.generateTimelineData())
                break
        }
    }

    generateTradeData() {
        return [
            { name: 'AK Redline FT', profit: 45, count: 1, avgReturn: 12.3 },
            { name: 'AWP Lightning MW', profit: 120, count: 1, avgReturn: 8.7 },
            { name: 'Karambit Fade', profit: -89, count: 1, avgReturn: -3.1 },
            { name: 'M4A4 Howl FT', profit: 234, count: 1, avgReturn: 15.2 },
            { name: 'Glock Fade FN', profit: 67, count: 1, avgReturn: 9.8 }
        ]
    }

    generateTimelineData() {
        return [
            { name: 'Week 1', profit: 145, count: 8, avgReturn: 4.2 },
            { name: 'Week 2', profit: 267, count: 12, avgReturn: 6.8 },
            { name: 'Week 3', profit: -45, count: 6, avgReturn: -1.2 },
            { name: 'Week 4', profit: 189, count: 15, avgReturn: 3.9 }
        ]
    }

    showFallbackChart() {
        if (!this.container) return

        this.container.innerHTML = `
            <div class="fallback-waterfall bg-gray-900 rounded-lg p-6">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="bar-chart-3" class="w-8 h-8 text-white"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-2">P&L Waterfall Analysis</h3>
                    <p class="text-gray-400 text-sm">Advanced charting loading...</p>
                </div>
                
                <div class="grid grid-cols-4 gap-4 mb-4">
                    <div class="bg-green-600 p-3 rounded text-center">
                        <div class="text-white font-semibold">+$450</div>
                        <div class="text-green-200 text-sm">Rifles</div>
                    </div>
                    <div class="bg-red-600 p-3 rounded text-center">
                        <div class="text-white font-semibold">-$120</div>
                        <div class="text-red-200 text-sm">Cases</div>
                    </div>
                    <div class="bg-green-500 p-3 rounded text-center">
                        <div class="text-white font-semibold">+$780</div>
                        <div class="text-green-200 text-sm">Gloves</div>
                    </div>
                    <div class="bg-blue-600 p-3 rounded text-center">
                        <div class="text-white font-semibold">$1,110</div>
                        <div class="text-blue-200 text-sm">Net</div>
                    </div>
                </div>
            </div>
        `
    }

    // Cleanup method
    destroy() {
        // Remove any tooltips
        this.d3?.selectAll('.waterfall-tooltip').remove()
    }
}