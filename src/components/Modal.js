// ================================================================================================
// CS2 TRADING TRACKER - MODAL COMPONENT
// ================================================================================================
// Reusable modal system for forms, confirmations, and detailed views
// ================================================================================================

export class ModalComponent {
    constructor(modalId, options = {}) {
        this.modalId = modalId
        this.options = {
            backdrop: true,
            keyboard: true,
            focus: true,
            closable: true,
            ...options
        }
        this.isOpen = false
        this.modal = null
        this.onClose = options.onClose || (() => {})
        this.onOpen = options.onOpen || (() => {})
    }

    create(title, content, footer = '') {
        const modalHtml = `
            <div id="${this.modalId}" class="modal-overlay fixed inset-0 z-50 hidden">
                <div class="modal-backdrop absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
                <div class="modal-container flex items-center justify-center min-h-screen p-4">
                    <div class="modal-content glass-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate__animated animate__fadeInUp">
                        <!-- Modal Header -->
                        <div class="modal-header flex items-center justify-between p-6 border-b border-gray-700">
                            <h2 class="text-xl font-bold gradient-text">${title}</h2>
                            ${this.options.closable ? `
                                <button class="modal-close text-gray-400 hover:text-white transition-colors">
                                    <i data-lucide="x" class="w-6 h-6"></i>
                                </button>
                            ` : ''}
                        </div>
                        
                        <!-- Modal Body -->
                        <div class="modal-body p-6 overflow-y-auto max-h-[60vh]">
                            ${content}
                        </div>
                        
                        <!-- Modal Footer -->
                        ${footer ? `
                            <div class="modal-footer flex items-center justify-end gap-3 p-6 border-t border-gray-700">
                                ${footer}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `

        // Remove existing modal if it exists
        const existingModal = document.getElementById(this.modalId)
        if (existingModal) {
            existingModal.remove()
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml)
        this.modal = document.getElementById(this.modalId)

        // Setup event listeners
        this.setupEventListeners()

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }

        return this.modal
    }

    setupEventListeners() {
        if (!this.modal) return

        // Close button
        const closeButton = this.modal.querySelector('.modal-close')
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close())
        }

        // Backdrop click
        if (this.options.backdrop) {
            const backdrop = this.modal.querySelector('.modal-backdrop')
            backdrop.addEventListener('click', () => this.close())
        }

        // Keyboard events
        if (this.options.keyboard) {
            document.addEventListener('keydown', this.handleKeydown.bind(this))
        }

        // Prevent content click from closing modal
        const modalContent = this.modal.querySelector('.modal-content')
        modalContent.addEventListener('click', (e) => e.stopPropagation())
    }

    handleKeydown(e) {
        if (this.isOpen && e.key === 'Escape' && this.options.keyboard) {
            this.close()
        }
    }

    open() {
        if (!this.modal || this.isOpen) return

        this.modal.classList.remove('hidden')
        document.body.classList.add('modal-open')
        this.isOpen = true

        // Focus management
        if (this.options.focus) {
            const firstFocusable = this.modal.querySelector('input, button, textarea, select')
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100)
            }
        }

        this.onOpen()
        console.log(`📱 Modal opened: ${this.modalId}`)
    }

    close() {
        if (!this.modal || !this.isOpen) return

        this.modal.classList.add('hidden')
        document.body.classList.remove('modal-open')
        this.isOpen = false

        this.onClose()
        console.log(`📱 Modal closed: ${this.modalId}`)
    }

    updateContent(content) {
        const modalBody = this.modal?.querySelector('.modal-body')
        if (modalBody) {
            modalBody.innerHTML = content
            
            // Reinitialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
        }
    }

    updateTitle(title) {
        const modalTitle = this.modal?.querySelector('.modal-header h2')
        if (modalTitle) {
            modalTitle.innerHTML = title
        }
    }

    destroy() {
        if (this.modal) {
            // Remove keyboard listener
            document.removeEventListener('keydown', this.handleKeydown.bind(this))
            
            // Remove modal from DOM
            this.modal.remove()
            this.modal = null
            this.isOpen = false
            
            // Clean up body class
            if (!document.querySelector('.modal-overlay:not(.hidden)')) {
                document.body.classList.remove('modal-open')
            }
        }
    }

    // Static factory methods for common modal types
    static createConfirmModal(title, message, onConfirm, onCancel = () => {}) {
        const modalId = `confirm-modal-${Date.now()}`
        const modal = new ModalComponent(modalId, {
            onClose: onCancel
        })

        const content = `
            <div class="text-center">
                <div class="text-yellow-400 text-6xl mb-4">⚠️</div>
                <p class="text-gray-300 text-lg mb-6">${message}</p>
            </div>
        `

        const footer = `
            <button class="cancel-btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
                Cancel
            </button>
            <button class="confirm-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition">
                Confirm
            </button>
        `

        modal.create(title, content, footer)

        // Setup button handlers
        const confirmBtn = modal.modal.querySelector('.confirm-btn')
        const cancelBtn = modal.modal.querySelector('.cancel-btn')

        confirmBtn.addEventListener('click', () => {
            onConfirm()
            modal.close()
            modal.destroy()
        })

        cancelBtn.addEventListener('click', () => {
            onCancel()
            modal.close()
            modal.destroy()
        })

        return modal
    }

    static createFormModal(title, formHtml, onSubmit, onCancel = () => {}) {
        const modalId = `form-modal-${Date.now()}`
        const modal = new ModalComponent(modalId, {
            onClose: onCancel
        })

        const footer = `
            <button type="button" class="cancel-btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
                Cancel
            </button>
            <button type="submit" class="submit-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                Save
            </button>
        `

        modal.create(title, `<form class="modal-form">${formHtml}</form>`, footer)

        // Setup form handlers
        const form = modal.modal.querySelector('.modal-form')
        const submitBtn = modal.modal.querySelector('.submit-btn')
        const cancelBtn = modal.modal.querySelector('.cancel-btn')

        const handleSubmit = (e) => {
            e.preventDefault()
            const formData = new FormData(form)
            const data = Object.fromEntries(formData.entries())
            onSubmit(data)
            modal.close()
            modal.destroy()
        }

        form.addEventListener('submit', handleSubmit)
        submitBtn.addEventListener('click', handleSubmit)

        cancelBtn.addEventListener('click', () => {
            onCancel()
            modal.close()
            modal.destroy()
        })

        return modal
    }

    static createInfoModal(title, content) {
        const modalId = `info-modal-${Date.now()}`
        const modal = new ModalComponent(modalId)

        const footer = `
            <button class="close-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                Close
            </button>
        `

        modal.create(title, content, footer)

        // Setup close handler
        const closeBtn = modal.modal.querySelector('.close-btn')
        closeBtn.addEventListener('click', () => {
            modal.close()
            modal.destroy()
        })

        return modal
    }
}