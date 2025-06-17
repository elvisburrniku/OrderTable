import CountdownDemo from '@/components/countdown-demo';

export default function CountdownDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Whimsical Reservation Time Countdown
          </h1>
          <p className="text-lg text-gray-600">
            Experience delightful animated countdowns for upcoming reservations
          </p>
        </div>
        
        <CountdownDemo />
      </div>
    </div>
  );
}