// Enhanced dependency loading system
console.log('🚀 Starting SkinStatz initialization...')

// Add missing utility functions that might be needed globally
window.generateWeeksForMonth = function(year, monthIndex) {
    const weeks = []
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const totalDays = lastDay.getDate()
    
    let startDay = 1
    let weekNumber = 1
    
    while (startDay <= totalDays) {
        const endDay = Math.min(startDay + 6, totalDays)
        weeks.push({
            weekNumber: weekNumber,
            startDay: startDay,
            endDay: endDay,
            label: `Week ${weekNumber} (${startDay}-${endDay})`,
            days: Array.from({length: endDay - startDay + 1}, (_, i) => startDay + i)
        })
        startDay = endDay + 1
        weekNumber++
    }
    
    return weeks
}

// Add error handling for missing DOM elements
function safeGetElement(id, suppressWarning = false) {
    const element = document.getElementById(id)
    if (!element && !suppressWarning) {
        // Only warn for critical elements that should exist
        const criticalElements = ['main-content', 'nav-sidebar', 'mobile-nav-toggle']
        if (criticalElements.includes(id)) {
            console.warn(`⚠️ Critical element not found: ${id}`)
        }
    }
    return element
}

// Event delegation system for handling all clicks
function setupEventDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]') || e.target
        
        // Handle reload buttons
        if (target.textContent?.includes('Reload') || target.getAttribute('onclick')?.includes('location.reload')) {
            e.preventDefault()
            location.reload()
            return
        }
        
        // Handle navigation to tracker.html
        if (target.getAttribute('onclick')?.includes('tracker.html')) {
            e.preventDefault()
            window.location.href = 'tracker.html'
            return
        }
        
        // Handle console clear and reload
        if (target.getAttribute('onclick')?.includes('console.clear')) {
            e.preventDefault()
            console.clear()
            location.reload()
            return
        }
        
        // Handle hash navigation
        if (target.getAttribute('onclick')?.includes('window.location.hash')) {
            e.preventDefault()
            const match = target.getAttribute('onclick').match(/'([^']+)'/);
            if (match) {
                window.location.hash = match[1]
            }
            return
        }
        
        // Handle dashboard navigation buttons
        if (target.id === 'dashboard-add-trade' || target.closest('#dashboard-add-trade')) {
            e.preventDefault()
            console.log('🔍 Dashboard Add Trade button clicked - navigating to #/trading')
            window.location.hash = '#/trading'
            return
        }
        
        if (target.id === 'dashboard-add-investment' || target.closest('#dashboard-add-investment')) {
            e.preventDefault()
            console.log('🔍 Dashboard Add Investment button clicked - navigating to #/investments')
            window.location.hash = '#/investments'
            return
        }
        
        if (target.id === 'dashboard-add-drop' || target.closest('#dashboard-add-drop')) {
            e.preventDefault()
            console.log('🔍 Dashboard Add Drop button clicked - navigating to #/cases')
            window.location.hash = '#/cases'
            return
        }
        
        // Handle date picker triggers
        if (target.getAttribute('onclick')?.includes('.showPicker()')) {
            e.preventDefault()
            const match = target.getAttribute('onclick').match(/getElementById\('([^']+)'\)/)
            if (match) {
                const datePicker = document.getElementById(match[1])
                if (datePicker) {
                    datePicker.showPicker()
                }
            }
            return
        }
        
        // Handle investments page functions
        if (target.getAttribute('onclick')?.includes('investmentsPage')) {
            e.preventDefault()
            const onclick = target.getAttribute('onclick')
            
            if (onclick.includes('toggleSortDropdown')) {
                window.investmentsPage?.toggleSortDropdown()
            } else if (onclick.includes('selectSortOption')) {
                const match = onclick.match(/selectSortOption\('([^']+)'\)/)
                if (match) {
                    window.investmentsPage?.selectSortOption(match[1])
                }
            } else if (onclick.includes('selectStatusFilter')) {
                const match = onclick.match(/selectStatusFilter\(([^)]+)\)/)
                if (match) {
                    const value = match[1] === 'null' ? null : match[1].replace(/'/g, '')
                    window.investmentsPage?.selectStatusFilter(value)
                }
            } else if (onclick.includes('quickSellLongTerm')) {
                const match = onclick.match(/quickSellLongTerm\('([^']+)'\)/)
                if (match) {
                    window.investmentsPage?.quickSellLongTerm(match[1])
                }
            } else if (onclick.includes('editLongTermInvestment')) {
                const match = onclick.match(/editLongTermInvestment\('([^']+)'\)/)
                if (match) {
                    window.investmentsPage?.editLongTermInvestment(match[1])
                }
            } else if (onclick.includes('deleteLongTermInvestment')) {
                const match = onclick.match(/deleteLongTermInvestment\('([^']+)'\)/)
                if (match) {
                    window.investmentsPage?.deleteLongTermInvestment(match[1])
                }
            }
            return
        }
        
        // Handle trading page functions
        if (target.getAttribute('onclick')?.includes('tradingPage')) {
            e.preventDefault()
            const onclick = target.getAttribute('onclick')
            
            if (onclick.includes('safeAddTrade')) {
                window.tradingPage?.safeAddTrade()
            } else if (onclick.includes('selectStatusFilter')) {
                const match = onclick.match(/selectStatusFilter\(([^)]+)\)/)
                if (match) {
                    const value = match[1] === 'null' ? null : match[1].replace(/'/g, '')
                    window.tradingPage?.selectStatusFilter(value)
                }
            } else if (onclick.includes('toggleSortDropdown')) {
                window.tradingPage?.toggleSortDropdown()
            } else if (onclick.includes('selectSortOption')) {
                const match = onclick.match(/selectSortOption\('([^']+)'\)/)
                if (match) {
                    window.tradingPage?.selectSortOption(match[1])
                }
            } else if (onclick.includes('closeAddTradeModal')) {
                window.tradingPage?.closeAddTradeModal()
            } else if (onclick.includes('openSellModal')) {
                const match = onclick.match(/openSellModal\(([^)]+)\)/)
                if (match) {
                    window.tradingPage?.openSellModal(parseInt(match[1]))
                }
            } else if (onclick.includes('editTrade')) {
                const match = onclick.match(/editTrade\(([^)]+)\)/)
                if (match) {
                    window.tradingPage?.editTrade(parseInt(match[1]))
                }
            } else if (onclick.includes('deleteTrade')) {
                const match = onclick.match(/deleteTrade\(([^)]+)\)/)
                if (match) {
                    window.tradingPage?.deleteTrade(parseInt(match[1]))
                }
            }
            return
        }
        
        // Log unhandled clicks for debugging
        if (target.getAttribute('onclick')) {
            console.log('🔍 Unhandled onclick:', target.getAttribute('onclick'))
        }
    })
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting module initialization...')
    
    // Setup event delegation for all clicks
    setupEventDelegation()
    console.log('✅ Event delegation system activated')
    
    // Set a global timeout to prevent infinite loading
    const globalTimeout = setTimeout(() => {
        console.error('❌ Global initialization timeout - forcing fallback interface')
        showErrorInterface(new Error('Initialization timed out after 10 seconds'))
    }, 10000) // 10 second global timeout
    
    try {
        // Load modules in sequence with timeout protection
        console.log('📦 Loading store module...')
        await Promise.race([
            import('./store.js'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Store module timeout')), 3000))
        ])
        
        // Wait a bit for store to be available globally
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (!window.useAppStore) {
            throw new Error('Store module failed to export useAppStore globally')
        }
        console.log('✅ Store module loaded successfully')
        
        console.log('📦 Loading router module...')
        await Promise.race([
            import('./router.js'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Router module timeout')), 3000))
        ])
        
        // Wait a bit for router to be available globally
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (!window.CS2Router) {
            throw new Error('Router module failed to export CS2Router globally')
        }
        console.log('✅ Router module loaded successfully')
        
        console.log('📦 Loading main application...')
        await Promise.race([
            import('./main.js'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Main application timeout')), 5000))
        ])
        console.log('✅ Main application loaded successfully')
        
        // Clear the global timeout since we succeeded
        clearTimeout(globalTimeout)
        console.log('🎉 All modules loaded successfully!')
        
    } catch (error) {
        clearTimeout(globalTimeout)
        console.error('❌ Module loading failed:', error)
        showErrorInterface(error)
    }
})

// Error interface fallback
function showErrorInterface(error) {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
        // Clear existing content
        mainContent.textContent = '';
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'text-center py-20';
        
        // Error icon
        const errorIcon = document.createElement('div');
        errorIcon.className = 'text-red-400 text-6xl mb-4 flex justify-center';
        
        // Create SVG warning icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '64');
        svg.setAttribute('height', '64');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2L2 22h20L12 2zm0 3.1l7.3 14.9H4.7L12 5.1zM11 10v4h2v-4h-2zm0 5v2h2v-2h-2z');
        svg.appendChild(path);
        errorIcon.appendChild(svg);
        container.appendChild(errorIcon);
        
        // Title
        const title = document.createElement('h1');
        title.className = 'text-3xl font-bold text-red-400 mb-4';
        title.textContent = 'Module Loading Error';
        container.appendChild(title);
        
        // Error message
        const message = document.createElement('p');
        message.className = 'text-gray-400 mb-4';
        message.textContent = error.message;
        container.appendChild(message);
        
        // Card container
        const card = document.createElement('div');
        card.className = 'glass-card rounded-xl p-6 max-w-md mx-auto';
        
        // Card title
        const cardTitle = document.createElement('h3');
        cardTitle.className = 'text-lg font-semibold text-white mb-3';
        cardTitle.textContent = 'Troubleshooting:';
        card.appendChild(cardTitle);
        
        // List
        const list = document.createElement('ul');
        list.className = 'text-left text-gray-300 space-y-2 mb-4';
        
        const items = [
            '• Check browser console for detailed errors',
            '• Verify all files are properly served',
            '• Try refreshing the page',
            '• Use the original tracker as fallback'
        ];
        
        items.forEach(itemText => {
            const li = document.createElement('li');
            li.textContent = itemText;
            list.appendChild(li);
        });
        card.appendChild(list);
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'space-y-2';
        
        // Reload button
        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg';
        reloadBtn.textContent = 'Reload Page';
        reloadBtn.addEventListener('click', () => location.reload());
        buttonContainer.appendChild(reloadBtn);
        
        // Tracker button
        const trackerBtn = document.createElement('button');
        trackerBtn.className = 'w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg';
        trackerBtn.textContent = 'Use Original Tracker';
        trackerBtn.addEventListener('click', () => window.location.href = 'tracker.html');
        buttonContainer.appendChild(trackerBtn);
        
        card.appendChild(buttonContainer);
        container.appendChild(card);
        mainContent.appendChild(container);
    }
}

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = safeGetElement('mobile-nav-toggle', true)
    const overlay = safeGetElement('mobile-overlay', true)
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const sidebar = safeGetElement('nav-sidebar')
            if (sidebar && overlay) {
                sidebar.classList.toggle('open')
                overlay.classList.toggle('hidden')
            }
        })
    }
    
    // Close mobile nav when overlay is clicked
    if (overlay) {
        overlay.addEventListener('click', () => {
            const sidebar = safeGetElement('nav-sidebar')
            if (sidebar) {
                sidebar.classList.remove('open')
                overlay.classList.add('hidden')
            }
        })
    }
    
    // Sidebar toggle functionality
    const sidebarToggle = safeGetElement('sidebar-toggle', true)
    const sidebar = safeGetElement('nav-sidebar')
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            console.log('Toggle clicked')
            sidebar.classList.toggle('collapsed')
            
            // Store the collapsed state in localStorage
            const isCollapsed = sidebar.classList.contains('collapsed')
            localStorage.setItem('sidebarCollapsed', isCollapsed)
            console.log('Sidebar collapsed:', isCollapsed)
        })
        
        // Restore sidebar state from localStorage
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
        console.log('Restored state:', isCollapsed)
        if (isCollapsed) {
            sidebar.classList.add('collapsed')
        }
    }
    
    // Support dropdown functionality
    const supportToggle = safeGetElement('support-toggle', true)
    const supportDropdown = safeGetElement('support-dropdown', true)
    const supportChevron = safeGetElement('support-chevron', true)
    
    if (supportToggle && supportDropdown && supportChevron) {
        // Force initial state to be closed
        supportDropdown.classList.add('hidden')
        supportChevron.style.transform = 'rotate(0deg)'
        
        supportToggle.addEventListener('click', () => {
            const isHidden = supportDropdown.classList.contains('hidden')
            
            if (isHidden) {
                supportDropdown.classList.remove('hidden')
                supportChevron.style.transform = 'rotate(180deg)'
                localStorage.setItem('supportDropdownOpen', 'true')
            } else {
                supportDropdown.classList.add('hidden')
                supportChevron.style.transform = 'rotate(0deg)'
                localStorage.setItem('supportDropdownOpen', 'false')
            }
        })
        
        // Only restore state if explicitly set to true
        setTimeout(() => {
            const storedState = localStorage.getItem('supportDropdownOpen')
            if (storedState === 'true') {
                supportDropdown.classList.remove('hidden')
                supportChevron.style.transform = 'rotate(180deg)'
            }
        }, 100)
    }
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons()
    }
    
    // Test navigation click detection
    document.addEventListener('click', (e) => {
        if (e.target.closest('a[href^="#/"]')) {
            const link = e.target.closest('a[href^="#/"]')
            console.log('🔍 Navigation link clicked:', link.href)
        }
    })
})

// Emergency fallback - if nothing loads after 5 seconds, show basic content
setTimeout(() => {
    const mainContent = safeGetElement('main-content')
    const initialLoading = safeGetElement('initial-loading', true)
    
    // Only show emergency fallback if still showing loading screen
    if (mainContent && initialLoading && initialLoading.style.display !== 'none') {
        console.warn('🚨 Emergency fallback activated - modules failed to load in time')
        
        // Clear existing content
        mainContent.textContent = '';
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'text-center py-20';
        
        // Title
        const title = document.createElement('h1');
        title.className = 'text-3xl font-bold gradient-text mb-4';
        title.textContent = 'SkinStatz Dashboard';
        container.appendChild(title);
        
        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.className = 'text-gray-400 mb-8';
        subtitle.textContent = 'Emergency Mode - Basic functionality available';
        container.appendChild(subtitle);
        
        // Card container
        const card = document.createElement('div');
        card.className = 'glass-card rounded-xl p-6 max-w-md mx-auto';
        
        // Card title
        const cardTitle = document.createElement('h3');
        cardTitle.className = 'text-lg font-semibold text-white mb-3';
        cardTitle.textContent = 'Quick Actions:';
        card.appendChild(cardTitle);
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'space-y-3';
        
        // Tracker button
        const trackerBtn = document.createElement('button');
        trackerBtn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg';
        trackerBtn.textContent = 'Use Original Tracker';
        trackerBtn.addEventListener('click', () => window.location.href = 'tracker.html');
        buttonContainer.appendChild(trackerBtn);
        
        // Try again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg';
        tryAgainBtn.textContent = 'Try Again';
        tryAgainBtn.addEventListener('click', () => location.reload());
        buttonContainer.appendChild(tryAgainBtn);
        
        // Clear console button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg';
        clearBtn.textContent = 'Clear Console & Reload';
        clearBtn.addEventListener('click', () => { console.clear(); location.reload(); });
        buttonContainer.appendChild(clearBtn);
        
        card.appendChild(buttonContainer);
        container.appendChild(card);
        
        // Footer text
        const footer = document.createElement('div');
        footer.className = 'mt-6 text-xs text-gray-500';
        footer.textContent = 'Check browser console (F12) for detailed error information';
        container.appendChild(footer);
        
        mainContent.appendChild(container);
        
        // Initialize icons for the emergency interface
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }
    }
}, 5000) // 5 second emergency timeout

console.log('🚀 SkinStatz - Enhanced Module Loading System')