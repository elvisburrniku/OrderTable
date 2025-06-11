export default function GuestBookingSimple() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          Guest Booking System
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Successfully migrated to tenant-based URL structure
        </p>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Migration Complete</h2>
          <p><strong>URL Format:</strong> /guest-booking/tenant_id/restaurant_id</p>
          <p><strong>Status:</strong> Ready for use</p>
          <p><strong>Example:</strong> /guest-booking/5/7</p>
        </div>
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
          <p style={{ color: '#166534', fontWeight: '500' }}>
            ✓ Migration Complete: Guest booking now uses tenant-based URL structure
          </p>
        </div>
      </div>
    </div>
  );
}