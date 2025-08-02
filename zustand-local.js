// ================================================================================================
// LOCAL ZUSTAND IMPLEMENTATION - NO EXTERNAL DEPENDENCIES
// ================================================================================================
// Simple state management that mimics Zustand's API for CS2 Trading Tracker
// ================================================================================================

(function() {
    'use strict';
    
    // Simple event emitter for store subscriptions
    class EventEmitter {
        constructor() {
            this.listeners = new Set();
        }
        
        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }
        
        emit(data) {
            this.listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error('Store listener error:', error);
                }
            });
        }
    }
    
    // Local Zustand create function implementation
    function create(stateInitializer) {
        let state = {};
        const emitter = new EventEmitter();
        
        // Set function - updates state and notifies listeners
        const set = (partial, replace = false) => {
            const nextState = typeof partial === 'function' 
                ? partial(state) 
                : partial;
                
            const previousState = state;
            state = replace ? nextState : { ...state, ...nextState };
            
            if (state !== previousState) {
                emitter.emit(state, previousState);
            }
        };
        
        // Get function - returns current state
        const get = () => state;
        
        // Subscribe function - adds listener for state changes
        const subscribe = (listener) => emitter.subscribe(listener);
        
        // Destroy function - cleans up listeners
        const destroy = () => {
            emitter.listeners.clear();
        };
        
        // Initialize the store with the provided state initializer
        const api = { set, get, subscribe, destroy };
        state = stateInitializer(set, get, api);
        
        // Return the store function that provides state access
        const useStore = (selector) => {
            if (selector) {
                return selector(state);
            }
            return state;
        };
        
        // Add store methods to the useStore function
        useStore.getState = get;
        useStore.setState = set;
        useStore.subscribe = subscribe;
        useStore.destroy = destroy;
        
        // Also add methods directly to the returned function for compatibility
        Object.defineProperty(useStore, 'getState', {
            value: get,
            writable: false,
            enumerable: true,
            configurable: false
        });
        
        console.log('🔧 Store created with methods:', Object.keys(useStore));
        console.log('🔧 getState type:', typeof useStore.getState);
        
        return useStore;
    }
    
    // Make available globally in the same way as Zustand UMD
    window.zustand = {
        create: create
    };
    
    console.log('🏪 Local Zustand implementation loaded successfully');
    
})();