(function() {
  'use strict';

  // Get configuration from script attributes
  const script = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const restaurantId = script.getAttribute('data-restaurant-id');
  const configData = script.getAttribute('data-config');
  
  if (!restaurantId) {
    console.error('Restaurant Booking Widget: Missing restaurant ID');
    return;
  }

  let config;
  try {
    config = configData ? JSON.parse(decodeURIComponent(configData)) : {};
  } catch (e) {
    console.error('Restaurant Booking Widget: Invalid configuration', e);
    config = {};
  }

  // Default configuration
  const defaultConfig = {
    type: 'floating-button',
    theme: 'modern',
    size: 'standard',
    primaryColor: '#2563eb',
    accentColor: '#1d4ed8',
    cornerRadius: 'medium',
    shadow: 'medium',
    buttonText: 'Book Table',
    headerText: 'Reserve Your Table',
    description: 'Quick and easy online reservations',
    placement: 'bottom-right',
    animation: 'slide-up',
    showBranding: true,
    customCSS: ''
  };

  // Merge configurations
  config = Object.assign({}, defaultConfig, config);

  // Helper functions for styling
  const getThemeStyles = (theme) => {
    const themes = {
      modern: {
        background: `linear-gradient(135deg, ${config.primaryColor}dd, ${config.primaryColor}bb)`,
        cardBackground: 'rgba(255, 255, 255, 0.95)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      },
      minimal: {
        background: '#ffffff',
        cardBackground: '#ffffff',
        color: config.primaryColor,
        border: `2px solid ${config.primaryColor}`
      },
      elegant: {
        background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
        cardBackground: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        color: '#ffffff',
        border: '1px solid #333'
      },
      vibrant: {
        background: `linear-gradient(135deg, ${config.primaryColor}, #ff6b6b, #4ecdc4)`,
        cardBackground: 'linear-gradient(135deg, #fff5f5, #ffffff)',
        color: '#ffffff',
        border: 'none'
      },
      dark: {
        background: 'linear-gradient(135deg, #1a1a1a, #2d3748)',
        cardBackground: 'linear-gradient(135deg, #2d3748, #4a5568)',
        color: '#ffffff',
        border: '1px solid #4a5568'
      }
    };
    return themes[theme] || themes.modern;
  };

  const getCornerRadius = (radius) => {
    const radiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '16px',
      full: '9999px'
    };
    return radiusMap[radius] || '8px';
  };

  const getSizePadding = (size) => {
    const sizeMap = {
      compact: '8px 16px',
      standard: '12px 24px',
      large: '16px 32px'
    };
    return sizeMap[size] || '12px 24px';
  };

  const getShadow = (shadow) => {
    const shadowMap = {
      none: 'none',
      subtle: '0 1px 3px rgba(0,0,0,0.1)',
      medium: '0 4px 12px rgba(0,0,0,0.15)',
      strong: '0 10px 25px rgba(0,0,0,0.25)'
    };
    return shadowMap[shadow] || '0 4px 12px rgba(0,0,0,0.15)';
  };

  const getAnimation = (animation) => {
    const animations = {
      'fade': 'rbw-fade-in',
      'slide-up': 'rbw-slide-up',
      'slide-right': 'rbw-slide-right',
      'scale': 'rbw-scale-in',
      'bounce': 'rbw-bounce-in'
    };
    return animations[animation] || '';
  };

  // Widget styles
  const widgetStyles = `
    .rbw-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      z-index: 999999;
      box-sizing: border-box;
      line-height: 1.5;
      --primary-color: ${config.primaryColor};
      --accent-color: ${config.accentColor};
      --corner-radius: ${getCornerRadius(config.cornerRadius)};
      --shadow: ${getShadow(config.shadow)};
    }
    
    .rbw-widget * {
      box-sizing: border-box;
    }
    
    .rbw-floating-button {
      position: fixed;
      cursor: pointer;
      border: none;
      font-weight: 600;
      box-shadow: var(--shadow);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.01em;
      border-radius: var(--corner-radius);
      padding: ${getSizePadding(config.size)};
      background: ${getThemeStyles(config.theme).background};
      color: ${getThemeStyles(config.theme).color};
      border: ${getThemeStyles(config.theme).border};
      font-size: ${config.size === 'compact' ? '14px' : config.size === 'standard' ? '16px' : '18px'};
    }
    
    .rbw-floating-button:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    }
    
    .rbw-floating-button:active {
      transform: translateY(0px) scale(1.0);
    }
    
    .rbw-inline-card {
      width: 100%;
      max-width: 400px;
      margin: 16px auto;
      background: ${getThemeStyles(config.theme).cardBackground};
      border-radius: var(--corner-radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    
    .rbw-banner {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, ${config.primaryColor}20, ${config.accentColor}20);
      border-radius: var(--corner-radius);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .rbw-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 320px;
      background: ${getThemeStyles(config.theme).cardBackground};
      box-shadow: var(--shadow);
      padding: 24px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    
    .rbw-sidebar.active {
      transform: translateX(0);
    }
    
    .rbw-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
    }
    
    .rbw-modal.active {
      display: flex;
    }
    
    .rbw-modal-content {
      background: ${getThemeStyles(config.theme).cardBackground};
      border-radius: var(--corner-radius);
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow);
      animation: rbw-modal-enter 0.3s ease;
      padding: 24px;
    }
    
    .rbw-form-field {
      margin-bottom: 16px;
    }
    
    .rbw-form-field label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
    }
    
    .rbw-form-field input,
    .rbw-form-field select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: var(--corner-radius);
      font-size: 16px;
      transition: all 0.2s ease;
    }
    
    .rbw-form-field input:focus,
    .rbw-form-field select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px ${config.primaryColor}20;
    }
    
    .rbw-button-primary {
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: var(--corner-radius);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      font-size: 16px;
    }
    
    .rbw-button-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .rbw-branding {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
    
    /* Animations */
    @keyframes rbw-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes rbw-slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes rbw-slide-right {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes rbw-scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes rbw-bounce-in {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes rbw-modal-enter {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .rbw-floating-button {
        padding: 12px 20px;
        font-size: 14px;
      }
      
      .rbw-inline-card {
        margin: 8px;
        max-width: none;
      }
      
      .rbw-sidebar {
        width: 100vw;
      }
      
      .rbw-modal-content {
        margin: 16px;
        max-width: calc(100vw - 32px);
      }
    }
    
    /* Custom CSS from config */
    ${config.customCSS || ''}
  `;
      justify-content: center;
      z-index: 1000000;
    }
    
    .rbw-modal-content {
      background: white;
      padding: 0;
      border-radius: 20px;
      width: 90%;
      max-width: 520px;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .rbw-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255,255,255,0.9);
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
      z-index: 10;
    }
    
    .rbw-close:hover {
      background: rgba(255,255,255,1);
      transform: scale(1.1);
      color: #333;
    }
    
    .rbw-form {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: none;
      border-radius: 20px;
      padding: 0;
      box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    
    .rbw-title {
      margin: 0;
      font-size: 32px;
      font-weight: 800;
      color: #111827;
      text-align: center;
      letter-spacing: -0.02em;
    }
    
    .rbw-header {
      background: linear-gradient(135deg, ${config.backgroundColor} 0%, ${adjustBrightness(config.backgroundColor, -15)} 100%);
      padding: 32px 32px 24px;
      position: relative;
      overflow: hidden;
    }
    
    .rbw-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .rbw-content {
      padding: 32px;
    }
    
    .rbw-field {
      margin-bottom: 20px;
    }
    
    .rbw-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #1f2937;
      font-size: 15px;
      letter-spacing: -0.01em;
    }
    
    .rbw-input, .rbw-select, .rbw-textarea {
      width: 100%;
      padding: 16px 18px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 16px;
      background: white;
      color: #111827;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
    }
    
    .rbw-input:focus, .rbw-select:focus, .rbw-textarea:focus {
      outline: none;
      border-color: ${config.backgroundColor};
      box-shadow: 0 0 0 4px ${config.backgroundColor}15, 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-1px);
    }
    
    .rbw-input::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }
    
    .rbw-submit {
      width: 100%;
      padding: 18px 32px;
      border: none;
      border-radius: 14px;
      font-weight: 700;
      font-size: 17px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(135deg, ${config.backgroundColor} 0%, ${adjustBrightness(config.backgroundColor, -10)} 100%);
      color: ${config.color};
      box-shadow: 0 8px 24px ${config.backgroundColor}30, 0 4px 12px rgba(0,0,0,0.1);
      letter-spacing: -0.01em;
      position: relative;
      overflow: hidden;
    }
    
    .rbw-submit::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }
    
    .rbw-submit:hover::before {
      left: 100%;
    }
  `;

  // Create and inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = widgetStyles;
  document.head.appendChild(styleSheet);

  // Widget creation functions
  function createFloatingButton() {
    const button = document.createElement('div');
    button.className = `rbw-widget rbw-floating-button ${getAnimation(config.animation)}`;
    
    // Position the button
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    
    Object.assign(button.style, positions[config.placement] || positions['bottom-right']);
    
    button.innerHTML = `
      <span style="font-size: 18px;">🍽️</span>
      <span>${config.buttonText}</span>
    `;
    
    button.addEventListener('click', openBookingModal);
    document.body.appendChild(button);
    return button;
  }

  function createInlineCard() {
    const container = document.getElementById('restaurant-booking-widget');
    if (!container) return null;
    
    const card = document.createElement('div');
    card.className = `rbw-widget rbw-inline-card ${getAnimation(config.animation)}`;
    
    card.innerHTML = `
      <div style="padding: 24px; text-align: center;">
        <h3 style="color: ${config.primaryColor}; margin-bottom: 8px; font-size: 20px; font-weight: 700;">
          ${config.headerText}
        </h3>
        <p style="color: #6b7280; margin-bottom: 20px; font-size: 14px;">
          ${config.description}
        </p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; background: #f9fafb; padding: 8px 12px; border-radius: ${getCornerRadius(config.cornerRadius)}; border: 1px solid #e5e7eb;">
            <span>📅</span>
            <span style="font-size: 14px; font-weight: 500;">Select Date</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; background: #f9fafb; padding: 8px 12px; border-radius: ${getCornerRadius(config.cornerRadius)}; border: 1px solid #e5e7eb;">
            <span>🕐</span>
            <span style="font-size: 14px; font-weight: 500;">Choose Time</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; background: #f9fafb; padding: 8px 12px; border-radius: ${getCornerRadius(config.cornerRadius)}; border: 1px solid #e5e7eb;">
            <span>👥</span>
            <span style="font-size: 14px; font-weight: 500;">Party Size</span>
          </div>
        </div>
        
        <button class="rbw-button-primary" onclick="window.restaurantBookingWidget.openBookingModal()">
          ${config.buttonText}
        </button>
        
        ${config.showBranding ? '<div class="rbw-branding">Powered by BookingSystem</div>' : ''}
      </div>
    `;
    
    container.appendChild(card);
    return card;
  }

  function createBanner() {
    const container = document.getElementById('restaurant-booking-widget');
    if (!container) return null;
    
    const banner = document.createElement('div');
    banner.className = `rbw-widget rbw-banner ${getAnimation(config.animation)}`;
    
    banner.innerHTML = `
      <div>
        <h4 style="color: ${config.primaryColor}; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">
          ${config.headerText}
        </h4>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          ${config.description}
        </p>
      </div>
      <button class="rbw-button-primary" style="width: auto; padding: 12px 24px;" onclick="window.restaurantBookingWidget.openBookingModal()">
        ${config.buttonText}
      </button>
    `;
    
    container.appendChild(banner);
    return banner;
  }

  function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = `rbw-widget rbw-sidebar ${getAnimation(config.animation)}`;
    sidebar.id = 'rbw-sidebar';
    
    sidebar.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h3 style="color: ${config.primaryColor}; margin-bottom: 8px; font-size: 18px; font-weight: 700;">
          ${config.headerText}
        </h3>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          ${config.description}
        </p>
      </div>
      
      <div style="space-y: 12px; margin-bottom: 24px;">
        <div class="rbw-form-field">
          <label>📅 Select Date</label>
          <input type="date" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: ${getCornerRadius(config.cornerRadius)};">
        </div>
        <div class="rbw-form-field">
          <label>🕐 Choose Time</label>
          <select style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: ${getCornerRadius(config.cornerRadius)};">
            <option>7:00 PM</option>
            <option>7:30 PM</option>
            <option>8:00 PM</option>
          </select>
        </div>
        <div class="rbw-form-field">
          <label>👥 Party Size</label>
          <select style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: ${getCornerRadius(config.cornerRadius)};">
            <option>2 guests</option>
            <option>4 guests</option>
            <option>6 guests</option>
          </select>
        </div>
      </div>
      
      <button class="rbw-button-primary" onclick="window.restaurantBookingWidget.openBookingModal()">
        ${config.buttonText}
      </button>
      
      ${config.showBranding ? '<div class="rbw-branding">Powered by BookingSystem</div>' : ''}
      
      <button onclick="window.restaurantBookingWidget.closeSidebar()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">×</button>
    `;
    
    document.body.appendChild(sidebar);
    
    // Add trigger button
    const triggerButton = document.createElement('div');
    triggerButton.className = 'rbw-floating-button';
    triggerButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${getThemeStyles(config.theme).background};
      color: ${getThemeStyles(config.theme).color};
      border: ${getThemeStyles(config.theme).border};
      border-radius: ${getCornerRadius(config.cornerRadius)};
      padding: ${getSizePadding(config.size)};
      cursor: pointer;
      box-shadow: ${getShadow(config.shadow)};
    `;
    
    triggerButton.innerHTML = `
      <span>📋</span>
      <span>Reservations</span>
    `;
    
    triggerButton.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
    
    document.body.appendChild(triggerButton);
    return sidebar;
  }

  function openBookingModal() {
    const existingModal = document.getElementById('rbw-modal');
    if (existingModal) return;
    
    const modal = document.createElement('div');
    modal.className = 'rbw-modal active';
    modal.id = 'rbw-modal';
    
    modal.innerHTML = `
      <div class="rbw-modal-content">
        <h3 style="color: ${config.primaryColor}; margin-bottom: 16px; font-size: 24px; font-weight: 700; text-align: center;">
          ${config.headerText}
        </h3>
        <p style="color: #6b7280; margin-bottom: 24px; text-align: center; font-size: 14px;">
          ${config.description}
        </p>
        
        <form id="rbw-booking-form">
          <div class="rbw-form-field">
            <label>Full Name</label>
            <input type="text" required placeholder="Enter your name">
          </div>
          <div class="rbw-form-field">
            <label>Email</label>
            <input type="email" required placeholder="Enter your email">
          </div>
          <div class="rbw-form-field">
            <label>Phone</label>
            <input type="tel" required placeholder="Enter your phone">
          </div>
          <div class="rbw-form-field">
            <label>Date</label>
            <input type="date" required>
          </div>
          <div class="rbw-form-field">
            <label>Time</label>
            <select required>
              <option value="">Select time</option>
              <option value="18:00">6:00 PM</option>
              <option value="18:30">6:30 PM</option>
              <option value="19:00">7:00 PM</option>
              <option value="19:30">7:30 PM</option>
              <option value="20:00">8:00 PM</option>
              <option value="20:30">8:30 PM</option>
            </select>
          </div>
          <div class="rbw-form-field">
            <label>Party Size</label>
            <select required>
              <option value="">Select party size</option>
              <option value="1">1 person</option>
              <option value="2">2 people</option>
              <option value="3">3 people</option>
              <option value="4">4 people</option>
              <option value="5">5 people</option>
              <option value="6">6 people</option>
              <option value="7">7+ people</option>
            </select>
          </div>
          
          <button type="submit" class="rbw-button-primary">
            Complete Reservation
          </button>
        </form>
        
        ${config.showBranding ? '<div class="rbw-branding">Powered by BookingSystem</div>' : ''}
        
        <button onclick="window.restaurantBookingWidget.closeModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = document.getElementById('rbw-booking-form');
    form.addEventListener('submit', handleBookingSubmission);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  function handleBookingSubmission(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const bookingData = Object.fromEntries(formData.entries());
    
    // Get tenant and restaurant IDs from URL or config
    const urlParts = window.location.pathname.split('/');
    const tenantId = urlParts.find((part, index) => urlParts[index - 1] === 'tenants');
    
    // Redirect to booking page with pre-filled data
    const bookingUrl = `${window.location.origin}/guest-booking/${tenantId}/${restaurantId}?` + 
      new URLSearchParams(bookingData).toString();
    
    window.open(bookingUrl, '_blank');
    closeModal();
  }

  function closeModal() {
    const modal = document.getElementById('rbw-modal');
    if (modal) {
      modal.remove();
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById('rbw-sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
    }
  }

  // Initialize widget based on type
  function initializeWidget() {
    switch (config.type) {
      case 'floating-button':
        createFloatingButton();
        break;
      case 'inline-card':
        createInlineCard();
        break;
      case 'banner':
        createBanner();
        break;
      case 'sidebar':
        createSidebar();
        break;
      default:
        createFloatingButton();
    }
  }

  // Expose functions globally for onclick handlers
  window.restaurantBookingWidget = {
    openBookingModal,
    closeModal,
    closeSidebar,
    config
  };

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

})();
    
    .rbw-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px ${config.backgroundColor}40, 0 8px 16px rgba(0,0,0,0.15);
    }
    
    .rbw-submit:active {
      transform: translateY(0);
    }
    
    .rbw-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .rbw-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .rbw-loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: rbw-spin 1s linear infinite;
      margin-right: 8px;
    }
    
    @keyframes rbw-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .rbw-fade-in {
      animation: rbw-fade-in 0.3s ease-out;
    }
    
    .rbw-slide-in {
      animation: rbw-slide-in 0.3s ease-out;
    }
    
    .rbw-bounce-in {
      animation: rbw-bounce-in 0.5s ease-out;
    }
    
    @keyframes rbw-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes rbw-slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes rbw-bounce-in {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes ripple {
      to {
        transform: scale(2);
        opacity: 0;
      }
    }
    
    @media (max-width: 768px) {
      .rbw-grid {
        grid-template-columns: 1fr;
      }
      
      .rbw-modal-content {
        margin: 20px;
        width: calc(100% - 40px);
      }
      
      .rbw-button {
        padding: 12px 20px !important;
        font-size: 14px !important;
      }
    }
  `;

  // Inject styles
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    document.head.appendChild(styleEl);
  }

  // Create booking form
  function createBookingForm() {
    const form = document.createElement('div');
    form.className = 'rbw-form';
    
    // Header section
    const header = document.createElement('div');
    header.className = 'rbw-header';
    
    const title = document.createElement('h2');
    title.className = 'rbw-title';
    title.textContent = config.headerText;
    title.style.color = config.color;
    title.style.position = 'relative';
    title.style.zIndex = '2';
    header.appendChild(title);
    
    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      margin: 8px 0 0 0;
      font-size: 16px;
      color: ${config.color};
      opacity: 0.9;
      text-align: center;
      position: relative;
      z-index: 2;
      font-weight: 400;
    `;
    subtitle.textContent = 'Book your table in just a few clicks';
    header.appendChild(subtitle);
    
    form.appendChild(header);
    
    // Content section
    const content = document.createElement('div');
    content.className = 'rbw-content';

    // Date field
    if (config.showDate) {
      const dateField = document.createElement('div');
      dateField.className = 'rbw-field';
      
      const dateLabel = document.createElement('label');
      dateLabel.className = 'rbw-label';
      dateLabel.textContent = 'Preferred Date';
      dateField.appendChild(dateLabel);
      
      const dateInput = document.createElement('input');
      dateInput.className = 'rbw-input';
      dateInput.type = 'date';
      dateInput.name = 'date';
      dateInput.required = true;
      
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      dateInput.value = today;
      
      dateField.appendChild(dateInput);
      form.appendChild(dateField);
    }

    // OpenTable-style horizontal layout for main booking fields
    if (config.showDate || config.showTime || config.showGuests) {
      const horizontalGroup = document.createElement('div');
      horizontalGroup.className = 'rbw-horizontal-group';
      horizontalGroup.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
        justify-content: center;
        margin-bottom: 28px;
        padding: 24px;
        background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        border-radius: 16px;
        border: 2px solid #e2e8f0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      `;

      // Date field (styled like OpenTable)
      if (config.showDate) {
        const dateContainer = document.createElement('div');
        dateContainer.style.cssText = 'display: flex; flex-direction: column; min-width: 120px;';
        
        const dateLabel = document.createElement('label');
        dateLabel.className = 'rbw-label';
        dateLabel.textContent = 'Date';
        dateLabel.style.fontSize = '12px';
        dateLabel.style.fontWeight = '500';
        dateLabel.style.color = '#64748b';
        dateLabel.style.marginBottom = '4px';
        dateContainer.appendChild(dateLabel);
        
        const dateInputWrapper = document.createElement('div');
        dateInputWrapper.style.cssText = `
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          background: white;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        `;
        
        dateInputWrapper.addEventListener('mouseenter', () => {
          dateInputWrapper.style.borderColor = config.backgroundColor;
          dateInputWrapper.style.transform = 'translateY(-1px)';
          dateInputWrapper.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        });
        
        dateInputWrapper.addEventListener('mouseleave', () => {
          dateInputWrapper.style.borderColor = '#e2e8f0';
          dateInputWrapper.style.transform = 'translateY(0)';
          dateInputWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
        });
        
        const dateIcon = document.createElement('span');
        dateIcon.innerHTML = '📅';
        dateIcon.style.cssText = 'font-size: 18px; filter: grayscale(0.2);';
        dateInputWrapper.appendChild(dateIcon);
        
        const dateInput = document.createElement('input');
        dateInput.className = 'rbw-input';
        dateInput.type = 'date';
        dateInput.name = 'date';
        dateInput.required = true;
        dateInput.style.cssText = 'border: none; outline: none; background: transparent; font-weight: 600; font-size: 15px; color: #374151;';
        
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
        
        dateInputWrapper.appendChild(dateInput);
        dateContainer.appendChild(dateInputWrapper);
        horizontalGroup.appendChild(dateContainer);
      }

      // Time field
      if (config.showTime) {
        const timeContainer = document.createElement('div');
        timeContainer.style.cssText = 'display: flex; flex-direction: column; min-width: 100px;';
        
        const timeLabel = document.createElement('label');
        timeLabel.className = 'rbw-label';
        timeLabel.textContent = 'Time';
        timeLabel.style.fontSize = '12px';
        timeLabel.style.fontWeight = '500';
        timeLabel.style.color = '#64748b';
        timeLabel.style.marginBottom = '4px';
        timeContainer.appendChild(timeLabel);
        
        const timeSelectWrapper = document.createElement('div');
        timeSelectWrapper.style.cssText = `
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        `;
        
        const timeIcon = document.createElement('span');
        timeIcon.textContent = '🕐';
        timeIcon.style.fontSize = '14px';
        timeSelectWrapper.appendChild(timeIcon);
        
        const timeSelect = document.createElement('select');
        timeSelect.className = 'rbw-select';
        timeSelect.name = 'time';
        timeSelect.required = true;
        timeSelect.style.cssText = 'border: none; outline: none; background: transparent; font-weight: 500; font-size: 14px; cursor: pointer;';
        
        const timeSlots = generateTimeSlots();
        timeSlots.forEach(slot => {
          const option = document.createElement('option');
          option.value = slot.value;
          option.textContent = slot.label;
          timeSelect.appendChild(option);
        });
        
        timeSelectWrapper.appendChild(timeSelect);
        timeContainer.appendChild(timeSelectWrapper);
        horizontalGroup.appendChild(timeContainer);
      }

      // Guests field
      if (config.showGuests) {
        const guestsContainer = document.createElement('div');
        guestsContainer.style.cssText = 'display: flex; flex-direction: column; min-width: 100px;';
        
        const guestsLabel = document.createElement('label');
        guestsLabel.className = 'rbw-label';
        guestsLabel.textContent = 'Party Size';
        guestsLabel.style.fontSize = '12px';
        guestsLabel.style.fontWeight = '500';
        guestsLabel.style.color = '#64748b';
        guestsLabel.style.marginBottom = '4px';
        guestsContainer.appendChild(guestsLabel);
        
        const guestsSelectWrapper = document.createElement('div');
        guestsSelectWrapper.style.cssText = `
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        `;
        
        const guestsIcon = document.createElement('span');
        guestsIcon.textContent = '👥';
        guestsIcon.style.fontSize = '14px';
        guestsSelectWrapper.appendChild(guestsIcon);
        
        const guestsSelect = document.createElement('select');
        guestsSelect.className = 'rbw-select';
        guestsSelect.name = 'guests';
        guestsSelect.required = true;
        guestsSelect.style.cssText = 'border: none; outline: none; background: transparent; font-weight: 500; font-size: 14px; cursor: pointer;';
        
        for (let i = 1; i <= 12; i++) {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = i === 1 ? '1 guest' : `${i} guests`;
          if (i === 2) option.selected = true;
          guestsSelect.appendChild(option);
        }
        
        guestsSelectWrapper.appendChild(guestsSelect);
        guestsContainer.appendChild(guestsSelectWrapper);
        horizontalGroup.appendChild(guestsContainer);
      }

      // Search/Book button in the horizontal group
      const searchButton = document.createElement('button');
      searchButton.type = 'button';
      searchButton.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px; position: relative; z-index: 2;">
          <span>🔍</span>
          <span>Find a Table</span>
        </span>
      `;
      searchButton.style.cssText = `
        padding: 16px 28px;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: linear-gradient(135deg, ${config.backgroundColor} 0%, ${adjustBrightness(config.backgroundColor, -15)} 100%);
        color: ${config.color};
        box-shadow: 0 6px 20px ${config.backgroundColor}25, 0 2px 8px rgba(0,0,0,0.1);
        align-self: stretch;
        position: relative;
        overflow: hidden;
        letter-spacing: -0.01em;
        min-width: 140px;
      `;
      
      // Add shimmer effect to button
      const shimmer = document.createElement('div');
      shimmer.style.cssText = `
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.6s ease;
        pointer-events: none;
      `;
      searchButton.appendChild(shimmer);
      
      // Add hover effects
      searchButton.addEventListener('mouseover', () => {
        searchButton.style.transform = 'translateY(-3px) scale(1.02)';
        searchButton.style.boxShadow = `0 12px 32px ${config.backgroundColor}35, 0 6px 16px rgba(0,0,0,0.15)`;
        shimmer.style.left = '100%';
      });
      searchButton.addEventListener('mouseleave', () => {
        searchButton.style.transform = 'translateY(0) scale(1)';
        searchButton.style.boxShadow = `0 6px 20px ${config.backgroundColor}25, 0 2px 8px rgba(0,0,0,0.1)`;
      });
      
      // Add ripple effect
      searchButton.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          background: rgba(255,255,255,0.4);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        `;
        
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
      
      horizontalGroup.appendChild(searchButton);
      content.appendChild(horizontalGroup);
    }

    // Customer details
    const nameField = document.createElement('div');
    nameField.className = 'rbw-field';
    
    const nameLabel = document.createElement('label');
    nameLabel.className = 'rbw-label';
    nameLabel.textContent = 'Name';
    nameField.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.className = 'rbw-input';
    nameInput.type = 'text';
    nameInput.name = 'name';
    nameInput.placeholder = 'Your full name';
    nameInput.required = true;
    nameField.appendChild(nameInput);
    content.appendChild(nameField);

    const emailField = document.createElement('div');
    emailField.className = 'rbw-field';
    
    const emailLabel = document.createElement('label');
    emailLabel.className = 'rbw-label';
    emailLabel.textContent = 'Email';
    emailField.appendChild(emailLabel);
    
    const emailInput = document.createElement('input');
    emailInput.className = 'rbw-input';
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.placeholder = 'your@email.com';
    emailInput.required = true;
    emailField.appendChild(emailInput);
    content.appendChild(emailField);

    const phoneField = document.createElement('div');
    phoneField.className = 'rbw-field';
    
    const phoneLabel = document.createElement('label');
    phoneLabel.className = 'rbw-label';
    phoneLabel.textContent = 'Phone';
    phoneField.appendChild(phoneLabel);
    
    const phoneInput = document.createElement('input');
    phoneInput.className = 'rbw-input';
    phoneInput.type = 'tel';
    phoneInput.name = 'phone';
    phoneInput.placeholder = 'Your phone number';
    phoneField.appendChild(phoneInput);
    content.appendChild(phoneField);

    // Special requests
    if (config.showSpecialRequests) {
      const requestsField = document.createElement('div');
      requestsField.className = 'rbw-field';
      
      const requestsLabel = document.createElement('label');
      requestsLabel.className = 'rbw-label';
      requestsLabel.textContent = 'Special Requests';
      requestsField.appendChild(requestsLabel);
      
      const requestsTextarea = document.createElement('textarea');
      requestsTextarea.className = 'rbw-textarea';
      requestsTextarea.name = 'requests';
      requestsTextarea.placeholder = 'Any special requests or dietary requirements...';
      requestsTextarea.rows = 3;
      requestsField.appendChild(requestsTextarea);
      content.appendChild(requestsField);
    }

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top: 2px solid #f1f5f9; margin: 32px 0 24px; position: relative;';
    const dividerText = document.createElement('span');
    dividerText.textContent = 'Contact Information';
    dividerText.style.cssText = `
      position: absolute; 
      top: -12px; 
      left: 50%; 
      transform: translateX(-50%); 
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); 
      padding: 0 20px; 
      font-size: 14px; 
      color: #64748b; 
      font-weight: 600;
      letter-spacing: -0.01em;
    `;
    divider.appendChild(dividerText);
    content.appendChild(divider);

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.className = 'rbw-submit';
    submitButton.type = 'button';
    submitButton.textContent = 'Complete Reservation';
    submitButton.style.cssText += `
      background: linear-gradient(135deg, ${config.backgroundColor} 0%, ${adjustBrightness(config.backgroundColor, -10)} 100%);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      padding: 16px 24px;
      margin-top: 8px;
    `;
    submitButton.addEventListener('click', handleSubmit);
    content.appendChild(submitButton);
    
    // Footer text
    const footer = document.createElement('div');
    footer.style.cssText = 'text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;';
    footer.innerHTML = `
      <p style="font-size: 13px; color: #64748b; margin: 0; font-weight: 500;">
        🔒 Secure booking • ✨ Free cancellation up to 24 hours
      </p>
    `;
    content.appendChild(footer);
    
    form.appendChild(content);

    return form;
  }

  // Generate time slots
  function generateTimeSlots() {
    const slots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        
        slots.push({
          value: time24,
          label: time12
        });
      }
    }
    return slots;
  }

  // Utility function to adjust color brightness
  function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
  }

  // Handle form submission
  function handleSubmit(e) {
    const button = e.target;
    const form = button.closest('.rbw-form');
    const formData = new FormData();
    
    // Collect form data
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (input.required && !input.value.trim()) {
        input.style.borderColor = '#ef4444';
        isValid = false;
      } else {
        input.style.borderColor = '#d1d5db';
        formData.append(input.name, input.value);
      }
    });

    if (!isValid) {
      return;
    }

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<span class="rbw-loading"></span>Booking...';

    // Prepare booking data
    const bookingData = {
      restaurantId,
      date: formData.get('date'),
      time: formData.get('time'),
      guests: parseInt(formData.get('guests')) || 2,
      customerName: formData.get('name'),
      customerEmail: formData.get('email'),
      customerPhone: formData.get('phone'),
      specialRequests: formData.get('requests') || '',
      source: 'widget'
    };

    // Submit booking
    fetch(getApiUrl('/api/bookings'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
      button.disabled = false;
      if (data.success) {
        showSuccessMessage();
        if (config.type === 'popup') {
          closeModal();
        }
      } else {
        throw new Error(data.message || 'Booking failed');
      }
    })
    .catch(error => {
      button.disabled = false;
      button.textContent = 'Book Table';
      showErrorMessage(error.message);
    });
  }

  // Get API URL
  function getApiUrl(path) {
    return window.location.origin + path;
  }

  // Show success message
  function showSuccessMessage() {
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
      ">
        ✓ Booking request submitted successfully!
      </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 5000);
  }

  // Show error message
  function showErrorMessage(error) {
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
      ">
        ✗ ${error}
      </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 5000);
  }

  // Create floating button
  function createFloatingButton() {
    const button = document.createElement('button');
    button.className = `rbw-widget rbw-button rbw-${config.animation}-in`;
    button.textContent = config.buttonText;
    
    // Apply styling
    const sizeStyles = {
      small: { padding: '12px 20px', fontSize: '14px' },
      medium: { padding: '16px 28px', fontSize: '16px' },
      large: { padding: '20px 36px', fontSize: '18px' }
    };
    
    const size = sizeStyles[config.size];
    Object.assign(button.style, {
      background: `linear-gradient(135deg, ${config.backgroundColor} 0%, ${adjustBrightness(config.backgroundColor, -10)} 100%)`,
      color: config.color,
      borderRadius: `${config.borderRadius}px`,
      padding: size.padding,
      fontSize: size.fontSize
    });

    // Add icon to button
    const icon = document.createElement('span');
    icon.innerHTML = '🎯';
    icon.style.fontSize = '16px';
    button.insertBefore(icon, button.firstChild);

    // Position button
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    
    Object.assign(button.style, positions[config.placement]);

    button.addEventListener('click', openModal);
    return button;
  }

  // Create inline widget
  function createInlineWidget() {
    const container = document.createElement('div');
    container.className = `rbw-widget rbw-inline rbw-${config.animation}-in`;
    
    const form = createBookingForm();
    container.appendChild(form);
    
    return container;
  }

  // Open modal
  function openModal() {
    const modal = document.createElement('div');
    modal.className = `rbw-widget rbw-modal rbw-${config.animation}-in`;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'rbw-modal-content';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'rbw-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', closeModal);
    modalContent.appendChild(closeButton);
    
    const form = createBookingForm();
    modalContent.appendChild(form);
    
    modal.appendChild(modalContent);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(modal);
    window.currentModal = modal;
  }

  // Close modal
  function closeModal() {
    if (window.currentModal) {
      document.body.removeChild(window.currentModal);
      window.currentModal = null;
    }
  }

  // Initialize widget
  function initWidget() {
    injectStyles();
    
    const targetElement = document.getElementById('restaurant-booking-widget');
    
    switch (config.type) {
      case 'button':
        const button = createFloatingButton();
        document.body.appendChild(button);
        break;
        
      case 'inline':
        if (targetElement) {
          const widget = createInlineWidget();
          targetElement.appendChild(widget);
        }
        break;
        
      case 'popup':
        const popupButton = createFloatingButton();
        document.body.appendChild(popupButton);
        break;
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();