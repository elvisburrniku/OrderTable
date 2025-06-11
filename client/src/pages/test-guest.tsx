export default function TestGuest() {
  return (
    <div>
      <h1>Guest Booking Test Page</h1>
      <p>Migration Complete: URL structure uses /guest-booking/tenant_id/restaurant_id</p>
      <p>Current URL: {window.location.pathname}</p>
    </div>
  );
}