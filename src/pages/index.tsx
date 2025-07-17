// File: src/pages/index.tsx

'use client';

import { useState, useEffect } from 'react';
import Calendar, { Booking } from '@/components/Calendar';

export default function HomePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Load all bookings on mount
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/bookings');
      if (!res.ok) {
        console.error('Failed to load bookings');
        return;
      }
      // API now returns rows as [date, slotIdx, person]
      const rows: [string, string, string][] = await res.json();
      const bookingObjs: Booking[] = rows.map(([date, slotIdx, person]) => ({
        date,
        slotIdx: Number(slotIdx),
        person,
      }));
      setBookings(bookingObjs);
    }
    load();
  }, []);

  // Add a booking (date+slotIdx+person)
  const addBooking = async (b: Booking) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
    if (res.ok) {
      setBookings(prev => [...prev, b]);
    } else {
      console.error('Failed to add booking');
    }
  };

  // Remove a booking by date & slotIdx
  const removeBooking = async (date: string, slotIdx: number) => {
    const res = await fetch('/api/bookings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, slotIdx }),
    });
    if (res.ok) {
      // drop any booking matching that date & slotIdx
      setBookings(prev =>
        prev.filter(b => !(b.date === date && b.slotIdx === slotIdx))
      );
    } else {
      console.error('Failed to remove booking');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar Sign‑Up</h1>
      <Calendar
        bookings={bookings}
        addBooking={addBooking}
        removeBooking={removeBooking}
      />
    </div>
  );
}
