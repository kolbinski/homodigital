/**
 * HOMO DIGITAL — FIELD STATE v1.5 FINAL
 * Transforms page into system interface
 * MOBILE RESPONSIVE + POLAŁT FINAL IMPROVEMENTS
 */

// ============================================================================
// COOKIE HELPERS (NEW - for persistence fallback)
// ============================================================================

function setCookie(name, value, days = 365) {
  // NOTE: Cookies require HTTP/HTTPS protocol, won't work reliably on file://
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
// FIELD ID GENERATOR (Unicode-enhanced)
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
    this.resonance = 62;
    this.isActive = false;
    
    this.init();
  }
  
  init() {
    // IMPROVED: Cookie fallback for persistence
    this.fieldId = localStorage.getItem('homodigital_field_id') || getCookie('homodigital_field_id');
    if (!this.fieldId) {
      this.fieldId = generateFieldId();
      localStorage.setItem('homodigital_field_id', this.fieldId);
      setCookie('homodigital_field_id', this.fieldId);
      localStorage.setItem('homodigital_field_created_at', Date.now());
    } else if (!localStorage.getItem('homodigital_field_id')) {
      // Restore from cookie if localStorage was cleared
      localStorage.setItem('homodigital_field_id', this.fieldId);
    }
    
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
    const timeInField = Date.now() - parseInt(this.enteredAt);
    const days = timeInField / (1000 * 60 * 60 * 24);
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

  // NEW: Get LAST SEEN formatted
  getLastSeen() {
    const lastSeen = localStorage.getItem('homodigital_last_seen');
    if (!lastSeen) return 'just now';
    
    const timeSince = Math.floor((Date.now() - parseInt(lastSeen)) / 1000);
    if (timeSince < 60) return `${timeSince}s ago`;
    if (timeSince < 3600) return `${Math.floor(timeSince/60)}m ago`;
    return `${Math.floor(timeSince/3600)}h ago`;
  }

  showFieldIdInit() {
    // FIXED: Only show for truly new users (no localStorage AND no cookie)
    if (!localStorage.getItem('homodigital_field_id_initialized') && !getCookie('homodigital_field_id_initialized')) {
      const initMsg = document.createElement('div');
      initMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Space Mono', monospace;
        color: #d4af37;
        font-size: 0.9rem;
        letter-spacing: 0.2em;
        z-index: 10001;
      `;
      initMsg.textContent = 'INITIALIZING FIELD ID...';
      document.body.appendChild(initMsg);
      
      setTimeout(() => {
        initMsg.textContent = 'FIELD ID ASSIGNED';
        setTimeout(() => {
          initMsg.remove();
          localStorage.setItem('homodigital_field_id_initialized', 'true');
          setCookie('homodigital_field_id_initialized', 'true');
        }, 800);
      }, 1000);
    }
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
  
  // NEW: Show reconnected message if returning after long absence
  showReconnectedMessage() {
    const lastSeen = localStorage.getItem('homodigital_last_seen');
    if (!lastSeen || !this.isActive) return;
    
    const timeSince = Date.now() - parseInt(lastSeen);
    const oneHour = 60 * 60 * 1000;
    
    if (timeSince > oneHour) {
      const reconnectMsg = document.createElement('div');
      reconnectMsg.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Space Mono', monospace;
        color: #d4af37;
        font-size: 0.8rem;
        letter-spacing: 0.2em;
        z-index: 9999;
        padding: 12px 24px;
        background: rgba(10, 10, 10, 0.9);
        border: 1px solid rgba(212, 175, 55, 0.3);
      `;
      reconnectMsg.textContent = 'FIELD RECONNECTED';
      document.body.appendChild(reconnectMsg);
      
      setTimeout(() => {
        reconnectMsg.style.transition = 'opacity 0.5s';
        reconnectMsg.style.opacity = '0';
        setTimeout(() => reconnectMsg.remove(), 500);
      }, 1500);
    }
  }
}

// ============================================================================
// UI INJECTION (MOBILE RESPONSIVE)
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
        <span style="white-space: nowrap;">YOUR RESONANCE:</span> <span style="color: #d4af37; white-space: nowrap;"><span id="field-resonance">62</span>/100</span>
      </span>
      <span class="field-symbol" style="margin-left: auto; color: #d4af37; font-size: 0.7rem;">
        ⧉
      </span>
    </div>
  `;
  
  document.body.insertBefore(bar, document.body.firstChild);
  
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
  fieldState.showFieldIdInit();
  
  // AUTO-ACTIVATE if on /begin page
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
  
  // FIXED: Update last seen on page load
  localStorage.setItem('homodigital_last_seen', Date.now());
  
  // FIXED: Also update on page close
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('homodigital_last_seen', Date.now());
  });
  
  setTimeout(function() {
    injectFieldBar();
    updateFieldBarValues();
    
    // FIXED: Show reconnected AFTER bar injection
    fieldState.showReconnectedMessage();
  }, 10000);
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldState, generateFieldId };
}
