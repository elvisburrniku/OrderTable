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
    type: 'button',
    size: 'medium',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    showDate: true,
    showTime: true,
    showGuests: true,
    showSpecialRequests: false,
    buttonText: 'Reserve Table',
    headerText: 'Make a Reservation',
    placement: 'bottom-right',
    animation: 'fade'
  };

  // Merge configurations
  config = Object.assign({}, defaultConfig, config);

  // Widget styles
  const widgetStyles = `
    .rbw-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 999999;
      box-sizing: border-box;
    }
    
    .rbw-widget * {
      box-sizing: border-box;
    }
    
    .rbw-button {
      position: fixed;
      cursor: pointer;
      border: none;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      user-select: none;
    }
    
    .rbw-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    
    .rbw-inline {
      width: 100%;
      max-width: 400px;
      margin: 20px auto;
    }
    
    .rbw-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
    }
    
    .rbw-modal-content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }
    
    .rbw-close {
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .rbw-close:hover {
      background: #f5f5f5;
    }
    
    .rbw-form {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
    }
    
    .rbw-title {
      margin: 0 0 20px 0;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    
    .rbw-field {
      margin-bottom: 16px;
    }
    
    .rbw-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }
    
    .rbw-input, .rbw-select, .rbw-textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      color: #111827;
    }
    
    .rbw-input:focus, .rbw-select:focus, .rbw-textarea:focus {
      outline: none;
      border-color: ${config.backgroundColor};
      box-shadow: 0 0 0 3px ${config.backgroundColor}20;
    }
    
    .rbw-submit {
      width: 100%;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: ${config.backgroundColor};
      color: ${config.color};
    }
    
    .rbw-submit:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    .rbw-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
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
    
    const title = document.createElement('h2');
    title.className = 'rbw-title';
    title.textContent = config.headerText;
    form.appendChild(title);

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

    // Time and Guests grid
    if (config.showTime || config.showGuests) {
      const gridDiv = document.createElement('div');
      gridDiv.className = 'rbw-grid';

      // Time field
      if (config.showTime) {
        const timeField = document.createElement('div');
        timeField.className = 'rbw-field';
        
        const timeLabel = document.createElement('label');
        timeLabel.className = 'rbw-label';
        timeLabel.textContent = 'Time';
        timeField.appendChild(timeLabel);
        
        const timeSelect = document.createElement('select');
        timeSelect.className = 'rbw-select';
        timeSelect.name = 'time';
        timeSelect.required = true;
        
        // Generate time slots
        const timeSlots = generateTimeSlots();
        timeSlots.forEach(slot => {
          const option = document.createElement('option');
          option.value = slot.value;
          option.textContent = slot.label;
          timeSelect.appendChild(option);
        });
        
        timeField.appendChild(timeSelect);
        gridDiv.appendChild(timeField);
      }

      // Guests field
      if (config.showGuests) {
        const guestsField = document.createElement('div');
        guestsField.className = 'rbw-field';
        
        const guestsLabel = document.createElement('label');
        guestsLabel.className = 'rbw-label';
        guestsLabel.textContent = 'Guests';
        guestsField.appendChild(guestsLabel);
        
        const guestsSelect = document.createElement('select');
        guestsSelect.className = 'rbw-select';
        guestsSelect.name = 'guests';
        guestsSelect.required = true;
        
        for (let i = 1; i <= 12; i++) {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = i === 1 ? '1 guest' : `${i} guests`;
          if (i === 2) option.selected = true;
          guestsSelect.appendChild(option);
        }
        
        guestsField.appendChild(guestsSelect);
        gridDiv.appendChild(guestsField);
      }

      form.appendChild(gridDiv);
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
    form.appendChild(nameField);

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
    form.appendChild(emailField);

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
    form.appendChild(phoneField);

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
      form.appendChild(requestsField);
    }

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.className = 'rbw-submit';
    submitButton.type = 'button';
    submitButton.textContent = 'Book Table';
    submitButton.addEventListener('click', handleSubmit);
    form.appendChild(submitButton);

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
      small: { padding: '8px 16px', fontSize: '14px' },
      medium: { padding: '12px 24px', fontSize: '16px' },
      large: { padding: '16px 32px', fontSize: '18px' }
    };
    
    const size = sizeStyles[config.size];
    Object.assign(button.style, {
      backgroundColor: config.backgroundColor,
      color: config.color,
      borderRadius: `${config.borderRadius}px`,
      padding: size.padding,
      fontSize: size.fontSize
    });

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