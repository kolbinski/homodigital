/**
 * HOMO DIGITAL — FIELD STATE v1.5
 * Transforms page into system interface
 * Implementation time: 10-15 minutes
 */

// ============================================================================
// FIELD ID GENERATOR (Unicode-enhanced)
// ============================================================================

function generateFieldId() {
  const unicodeChars = ['∞', '⊕', '⧉', '◇', '△', '▽', '⬡', '⌬', '⟁', '∴'];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Segment 1: Letter + 2 digits (e.g., K44)
  const segment1 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 100);
  
  // Segment 2: Letter + Unicode symbol (e.g., R∞)
  const segment2 = chars[Math.floor(Math.random() * 26)] + 
                   unicodeChars[Math.floor(Math.random() * unicodeChars.length)];
  
  // Segment 3: Letter + digit + Letter (e.g., A0B)
  const segment3 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 10) + 
                   chars[Math.floor(Math.random() * 26)];
  
  // Segment 4: Letter + 3-4 digits (e.g., K725)
  const segment4 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 1000);
  
  // Segment 5: lowercase letter + uppercase letter (e.g., iX)
  const segment5 = chars[Math.floor(Math.random() * 36)].toLowerCase() + 
                   chars[Math.floor(Math.random() * 26)];
  
  return `${segment1}-${segment2}-${segment3}-${segment4}-${segment5}`;
}

// ============================================================================
// FIELD STATE MANAGEMENT
// ============================================================================

class FieldState {
  constructor() {
    this.fieldId = null;
    this.enteredAt = null;
    this.resonance = 62; // Base resonance
    this.isActive = false;
    
    this.init();
  }
  
  init() {
    // Get or create Field ID
    this.fieldId = localStorage.getItem('homodigital_field_id');
    if (!this.fieldId) {
      this.fieldId = generateFieldId();
      localStorage.setItem('homodigital_field_id', this.fieldId);
    }
    
    // Check if already entered
    this.enteredAt = localStorage.getItem('homodigital_entered_at');
    if (this.enteredAt) {
      this.isActive = true;
      this.updateResonance();
    }
  }
  
  enter() {
    if (this.isActive) return;
    
    this.enteredAt = Date.now();
    localStorage.setItem('homodigital_entered_at', this.enteredAt);
    this.isActive = true;
    
    this.animateEntrance();
    this.showFieldBar();
  }
  
  updateResonance() {
    // Calculate resonance based on time in field and activity
    const timeInField = Date.now() - parseInt(this.enteredAt);
    const days = timeInField / (1000 * 60 * 60 * 24);
    
    // Resonance grows slowly with engagement
    this.resonance = Math.min(98, 62 + Math.floor(days * 0.5));
  }
  
  animateEntrance() {
    const body = document.body;
    body.style.transition = 'opacity 0.5s';
    body.style.opacity = '0';
    
    setTimeout(() => {
      body.style.opacity = '1';
    }, 500);
  }
  
  showFieldBar() {
    const bar = document.getElementById('field-state-bar');
    if (bar) {
      bar.style.visibility = 'visible';
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.style.transition = 'opacity 0.8s';
        bar.style.opacity = '1';
      }, 600);
    }
  }
  
  getState() {
    return {
      fieldId: this.fieldId,
      resonance: Math.floor(this.resonance),
      isActive: this.isActive,
      status: this.isActive ? 'ACTIVE' : 'INITIALIZING'
    };
  }
}

// ============================================================================
// UI INJECTION
// ============================================================================

function injectFieldBar() {
  const bar = document.createElement('div');
  bar.id = 'field-state-bar';
  bar.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: rgba(10, 10, 10, 0.95);
      backdrop-filter: blur(10px);
      padding: 12px 40px;
      z-index: 10000;
      font-family: 'Space Mono', monospace;
      font-size: 0.75rem;
      border-bottom: 1px solid rgba(212, 175, 55, 0.3);
      display: flex;
      visibility: ${fieldState.isActive ? 'visible' : 'hidden'};
      align-items: center;
      gap: 40px;
      letter-spacing: 0.1em;
    ">
      <span style="color: #d4af37;">
        FIELD: <span id="field-status">ACTIVE</span>
      </span>
      <span style="color: #999;">
        RESONANCE: <span id="field-resonance">62</span>/100
      </span>
      <span style="color: #999;">
        ID: <span id="field-id" style="color: #d4af37;">${fieldState.fieldId}</span>
      </span>
      <span style="margin-left: auto; color: #666; font-size: 0.7rem;">
        ⧉
      </span>
    </div>
  `;
  
  document.body.insertBefore(bar, document.body.firstChild);
  
  // Add padding to body to account for fixed bar
  if (fieldState.isActive) {
    document.body.style.paddingTop = '48px';
  }
}

function updateFieldBarValues() {
  const state = fieldState.getState();
  
  const statusEl = document.getElementById('field-status');
  const resonanceEl = document.getElementById('field-resonance');
  const idEl = document.getElementById('field-id');
  
  if (statusEl) statusEl.textContent = state.status;
  if (resonanceEl) resonanceEl.textContent = state.resonance;
  if (idEl) idEl.textContent = state.fieldId;
}

// ============================================================================
// ENTER FIELD HANDLER
// ============================================================================

function attachEnterHandler() {
  // Find all "ENTER THE FIELD" buttons
  const enterButtons = document.querySelectorAll('a[href*="begin"], button.btn-primary');
  
  enterButtons.forEach(button => {
    // Only attach to main CTA, not all buttons
    const text = button.textContent.trim().toUpperCase();
    if (text.includes('ENTER') || text.includes('WEJDŹ')) {
      button.addEventListener('click', (e) => {
        if (!fieldState.isActive) {
          e.preventDefault();
          fieldState.enter();
          // After entrance animation, proceed to original destination
          setTimeout(() => {
            if (button.href) {
              window.location.href = button.href;
            }
          }, 1000);
        }
      });
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let fieldState;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFieldState);
} else {
  initFieldState();
}

function initFieldState() {
  setTimeout(function() {
    // Initialize field state
    fieldState = new FieldState();
    
    // Inject UI
    injectFieldBar();
    updateFieldBarValues();
    
    // Attach handlers
    attachEnterHandler();
    
    // Update resonance every 10 seconds
    if (fieldState.isActive) {
      setInterval(() => {
        fieldState.updateResonance();
        updateFieldBarValues();
      }, 10000);
    }
    
    // Log state (for debugging)
    console.log('Field State initialized:', fieldState.getState());
  }, 10000);
}

// ============================================================================
// EXPORT (if using modules)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldState, generateFieldId };
}
