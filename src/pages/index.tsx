import Calendar from '../components/Calendar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Signup Calendar</h1>
      <Calendar />
    </div>
  );
}