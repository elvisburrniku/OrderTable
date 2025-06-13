import { useState } from "react";
import { useRoute } from "wouter";

const timeSlots = [
  "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15",
  "16:30", "16:45", "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45", "19:00", "19:15",
  "19:30", "19:45", "20:00"
];

export default function GuestBookingStandalone() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const tenantId = params?.tenantId;
  const restaurantId = params?.restaurantId;

  const [currentStep, setCurrentStep] = useState(0);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const displayStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      dates.push({ value: dateStr, display: displayStr });
    }
    return dates;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !customerData.name || !customerData.email) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          guestCount: guestCount,
          bookingDate: selectedDate,
          startTime: selectedTime,
          specialRequests: customerData.comment
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBookingId(result.id);
        setBookingComplete(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create booking'}`);
      }
    } catch (error: any) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingComplete) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '48px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'white',
            fontSize: '32px'
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Booking Confirmed!
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Your reservation has been successfully created. Booking ID: #{bookingId}
          </p>
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Date:</span>
              <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Time:</span>
              <strong>{selectedTime}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Guests:</span>
              <strong>{guestCount}</strong>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            A confirmation email has been sent to {customerData.email}
          </p>
        </div>
      </div>
    );
  }

  const stepTitles = ['Welcome', 'Guests', 'Date', 'Time', 'Details'];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '48px',
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            TROFTA Restaurant
          </h1>
          <p style={{ color: '#6b7280' }}>Reserve your table in a few simple steps</p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          {stepTitles.map((title, index) => (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                background: index <= currentStep ? '#f59e0b' : '#e5e7eb',
                color: index <= currentStep ? 'white' : '#9ca3af',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: index <= currentStep ? '#f59e0b' : '#9ca3af'
              }}>
                {title}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ minHeight: '400px', marginBottom: '32px' }}>
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#6b7280', marginBottom: '16px' }}>
                  📍 Downtown Location • Fine Dining
                </div>
                <div style={{ color: '#6b7280', marginBottom: '24px' }}>
                  📞 +1 (555) 123-4567
                </div>
              </div>
              <div style={{
                background: '#fef3c7',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                  Welcome to TROFTA
                </h3>
                <p style={{ color: '#374151', lineHeight: '1.6' }}>
                  Experience exceptional dining in our elegant atmosphere. Our reservation system 
                  makes it easy to secure your perfect table for any occasion.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Guest Count */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', textAlign: 'center', marginBottom: '24px' }}>
                How many guests?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
                  <button
                    key={count}
                    onClick={() => setGuestCount(count)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `2px solid ${guestCount === count ? '#f59e0b' : '#e5e7eb'}`,
                      background: guestCount === count ? '#fef3c7' : 'white',
                      color: guestCount === count ? '#92400e' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>👥</div>
                    <div style={{ fontWeight: '600' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {count === 1 ? 'Guest' : 'Guests'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', textAlign: 'center', marginBottom: '24px' }}>
                Select your date
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {generateDateOptions().map((date) => (
                  <button
                    key={date.value}
                    onClick={() => setSelectedDate(date.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      margin: '8px 0',
                      borderRadius: '8px',
                      border: `2px solid ${selectedDate === date.value ? '#f59e0b' : '#e5e7eb'}`,
                      background: selectedDate === date.value ? '#fef3c7' : 'white',
                      color: selectedDate === date.value ? '#92400e' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '16px',
                      fontWeight: selectedDate === date.value ? '600' : '400'
                    }}
                  >
                    {date.display}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Time Selection */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', textAlign: 'center', marginBottom: '24px' }}>
                Choose your time
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedTime === time ? '#f59e0b' : '#e5e7eb'}`,
                      background: selectedTime === time ? '#fef3c7' : 'white',
                      color: selectedTime === time ? '#92400e' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Customer Details */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', textAlign: 'center', marginBottom: '24px' }}>
                Your details
              </h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Special Requests
                  </label>
                  <textarea
                    value={customerData.comment}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Any special requests or dietary requirements?"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Booking Summary */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '24px'
              }}>
                <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Reservation Summary</h4>
                <div style={{ fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Restaurant:</span>
                    <strong>TROFTA Restaurant</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Date:</span>
                    <strong>{selectedDate && new Date(selectedDate).toLocaleDateString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Time:</span>
                    <strong>{selectedTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Guests:</span>
                    <strong>{guestCount}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              background: 'white',
              color: currentStep === 0 ? '#9ca3af' : '#374151',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            ← Back
          </button>

          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              disabled={
                (currentStep === 1 && !guestCount) ||
                (currentStep === 2 && !selectedDate) ||
                (currentStep === 3 && !selectedTime)
              }
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#f59e0b',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !customerData.name ||
                !customerData.email ||
                !selectedDate ||
                !selectedTime
              }
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#9ca3af' : '#10b981',
                color: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {isSubmitting ? 'Creating Booking...' : 'Confirm Reservation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}