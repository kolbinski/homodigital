/**
 * HOMO DIGITAL — FIELD STATE v1.5 FINAL
 * FIELD DRIFT — System that lives independently
 * PRODUCTION READY
 */

// ============================================================================
// COOKIE HELPERS
// ============================================================================

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

// ============================================================================
// FIELD ID GENERATOR
// ============================================================================

function generateFieldId() {
  const unicodeChars = ['∞', '⊕', '⧉', '◇', '△', '▽', '⬡', '⌬', '⟁', '∴'];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const segment1 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 100);
  
  const segment2 = chars[Math.floor(Math.random() * 26)] + 
                   unicodeChars[Math.floor(Math.random() * unicodeChars.length)];
  
  const segment3 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 10) + 
                   chars[Math.floor(Math.random() * 26)];
  
  const segment4 = chars[Math.floor(Math.random() * 26)] + 
                   Math.floor(Math.random() * 1000);
  
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
    this.resonance = 12;
    this.isActive = false;
    
    this.init();
  }
  
  init() {
    this.fieldId = localStorage.getItem('homodigital_field_id') || getCookie('homodigital_field_id');
    if (!this.fieldId) {
      this.fieldId = generateFieldId();
      localStorage.setItem('homodigital_field_id', this.fieldId);
      setCookie('homodigital_field_id', this.fieldId);
      localStorage.setItem('homodigital_field_created_at', Date.now());
      
      // Generate random initial resonance (8-15)
      const initialRes = 8 + Math.floor(Math.random() * 8);
      localStorage.setItem('homodigital_resonance', initialRes.toString());
      this.resonance = initialRes;
    } else if (!localStorage.getItem('homodigital_field_id')) {
      localStorage.setItem('homodigital_field_id', this.fieldId);
    }
    
    // Load resonance from storage
    const storedRes = localStorage.getItem('homodigital_resonance');
    if (storedRes) {
      this.resonance = parseInt(storedRes);
    }
    
    this.enteredAt = localStorage.getItem('homodigital_entered_at');
    if (this.enteredAt) {
      this.isActive = true;
      this.updateResonance();
    }
    
    // Apply field drift
    this.applyFieldDrift();
  }
  
  getDrift(fieldId, timestamp) {
    const hourBucket = Math.floor(timestamp / (1000 * 60 * 60));
    const seed = fieldId + hourBucket.toString();
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    
    const mod = Math.abs(hash) % 10;
    if (mod < 2) return -1;
    if (mod < 5) return 0;
    if (mod < 8) return 1;
    return 2;
  }
  
  applyFieldDrift() {
    const now = Date.now();
    const lastDrift = parseInt(localStorage.getItem('homodigital_last_drift')) || now;
    
    const minutesPassed = Math.floor((now - lastDrift) / 60000);
    
    if (minutesPassed > 0) {
      const hoursPassed = Math.floor(minutesPassed / 60);
      
      for (let i = 0; i < Math.min(hoursPassed, 48); i++) {
        const driftTime = lastDrift + (i * 60 * 60 * 1000);
        const drift = this.getDrift(this.fieldId, driftTime);
        this.resonance = Math.max(1, Math.min(98, this.resonance + drift));
      }
      
      localStorage.setItem('homodigital_last_drift', now.toString());
      localStorage.setItem('homodigital_resonance', this.resonance.toString());
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
    const timeInField = Date.now() - parseInt(this.enteredAt);
    const days = timeInField / (1000 * 60 * 60 * 24);
    
    const initialRes = parseInt(localStorage.getItem('homodigital_resonance')) || this.resonance;
    const timeBonus = Math.floor(days * 0.5);
    this.resonance = Math.max(1, Math.min(98, initialRes + timeBonus));
    
    localStorage.setItem('homodigital_resonance', this.resonance.toString());
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

  getLastSeen() {
    const lastSeen = localStorage.getItem('homodigital_last_seen');
    if (!lastSeen) return 'just now';
    
    const timeSince = Math.floor((Date.now() - parseInt(lastSeen)) / 1000);
    if (timeSince < 60) return `${timeSince}s ago`;
    if (timeSince < 3600) return `${Math.floor(timeSince/60)}m ago`;
    return `${Math.floor(timeSince/3600)}h ago`;
  }

  getFieldAge() {
    const createdAt = localStorage.getItem('homodigital_field_created_at');
    if (!createdAt) return '0d 0h 0m';
    
    const age = Date.now() - parseInt(createdAt);
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    const hours = Math.floor((age % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${mins}m`;
  }
}

// ============================================================================
// UI INJECTION
// ============================================================================

function injectFieldBar() {
  const bar = document.createElement('div');
  bar.id = 'field-state-bar';
  
  const isMobile = window.innerWidth <= 768;
  const lastSeenText = fieldState.getLastSeen();
  
  bar.innerHTML = `
    <style>
      @media (max-width: 1149px) {
        #field-state-bar > div {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 8px !important;
          padding: 12px 20px !important;
        }
        #field-state-bar .field-symbol {
          display: none !important;
        }
        #field-drift-message {
          margin-top: 4px;
        }
      }
    </style>
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
      <span>
        FIELD: <span id="field-status" style="color: #d4af37;">ACTIVE</span>
      </span>
      <span>
        <span style="white-space: nowrap;">YOUR SYNC:</span> <span style="color: #d4af37;">LIVE</span>
      </span>
      <span>
        <span style="white-space: nowrap;">YOUR FIELD AGE:</span> <span id="field-age" style="color: #d4af37; white-space: nowrap;">0d 0h 0m</span>
      </span>
      <span>
        LAST SEEN: <span id="last-seen" style="color: #d4af37;">${lastSeenText}</span>
      </span>
      <span>
        INSTANCE: <span style="color: #d4af37;">LOCAL</span>
      </span>
      <span>
        <span style="white-space: nowrap;">YOUR FIELD ID:</span> <span id="field-id" style="color: #d4af37; white-space: nowrap;">${fieldState.fieldId}</span>
      </span>
      <span>
        <span style="white-space: nowrap;">YOUR RESONANCE:</span> <span style="color: #d4af37; white-space: nowrap;"><span id="field-resonance">12</span>/100</span>
      </span> 
      <button id="field-close-btn" style="
        background: none;
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #d4af37;
        padding: 4px 12px;
        cursor: pointer;
        font-family: 'Space Mono', monospace;
        font-size: 0.7rem;
        margin-left: 20px;
        transition: all 0.3s;
        position: absolute;
        top: 12px;
        right: 12px;
      " onmouseover="this.style.background='rgba(212, 175, 55, 0.1)'" onmouseout="this.style.background='none'">
        ✕
      </button>
    </div>
    <div id="field-drift-message" style="
      position: fixed;
      top: 48px;
      left: 40px;
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem;
      color: rgba(212, 175, 55, 0.4);
      letter-spacing: 0.15em;
      z-index: 9999;
      display: ${fieldState.isActive ? 'block' : 'none'};
    ">
      FIELD EVOLVES EVEN IN SILENCE
    </div>
  `;
  
  document.body.insertBefore(bar, document.body.firstChild);

  // Close button handler
  const closeBtn = document.getElementById('field-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const fieldBar = document.getElementById('field-state-bar');
      const driftMsg = document.getElementById('field-drift-message');
      
      if (fieldBar) {
        fieldBar.style.transition = 'opacity 0.3s';
        fieldBar.style.opacity = '0';
        setTimeout(() => {
          fieldBar.style.display = 'none';
        }, 300);
      }
      
      if (driftMsg) {
        driftMsg.style.display = 'none';
      }
      
      document.body.style.paddingTop = '0';
      localStorage.setItem('homodigital_bar_hidden', 'true');
    });
  }
  
  if (fieldState.isActive) {
    document.body.style.paddingTop = isMobile ? '160px' : '48px';
  }
  
  window.addEventListener('resize', () => {
    const nowMobile = window.innerWidth <= 768;
    if (fieldState.isActive) {
      document.body.style.paddingTop = nowMobile ? '160px' : '48px';
    }
  });
}

function updateFieldBarValues() {
  const state = fieldState.getState();
  
  const statusEl = document.getElementById('field-status');
  const resonanceEl = document.getElementById('field-resonance');
  const idEl = document.getElementById('field-id');
  const ageEl = document.getElementById('field-age');
  const lastSeenEl = document.getElementById('last-seen');
  
  if (statusEl) statusEl.textContent = state.status;
  if (resonanceEl) resonanceEl.textContent = state.resonance;
  if (idEl) idEl.textContent = state.fieldId;
  if (ageEl) ageEl.textContent = fieldState.getFieldAge();
  if (lastSeenEl) lastSeenEl.textContent = fieldState.getLastSeen();
}

// ============================================================================
// ENTER FIELD HANDLER
// ============================================================================

function attachEnterHandler() {
  const enterButtons = document.querySelectorAll('a[href*="begin"], button.btn-primary');
  
  enterButtons.forEach(button => {
    const text = button.textContent.trim().toUpperCase();
    if (text.includes('ENTER') || text.includes('WEJDŹ')) {
      button.addEventListener('click', (e) => {
        if (!fieldState.isActive) {
          e.preventDefault();
          fieldState.enter();
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFieldState);
} else {
  initFieldState();
}

function initFieldState() {
  fieldState = new FieldState();
  
  if (window.location.pathname.includes('begin') && !fieldState.isActive) {
    fieldState.enteredAt = Date.now();
    localStorage.setItem('homodigital_entered_at', fieldState.enteredAt);
    fieldState.isActive = true;
  }
  
  attachEnterHandler();
  
  if (fieldState.isActive) {
    setInterval(() => {
      fieldState.updateResonance();
      updateFieldBarValues();
    }, 10000);
  }
  
  console.log('Field State initialized:', fieldState.getState());
  
  localStorage.setItem('homodigital_last_seen', Date.now());
  
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('homodigital_last_seen', Date.now());
  });
  
  setTimeout(function() {
    injectFieldBar();
    updateFieldBarValues();
  }, 10000);
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldState, generateFieldId };
}
