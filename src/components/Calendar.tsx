'use client';

import { useState, useEffect, useCallback } from 'react';

export type Booking = {
  date: string;
  slotIdx: number;
  person: string;
};

type Slot = { id: number; label: string };

type Range = { start: number; end: number; person: string };

export interface CalendarProps {
  bookings: Booking[];
  addBooking: (b: Booking) => Promise<void>;
  removeBooking: (date: string, slotIdx: number) => Promise<void>;
}

export default function Calendar({
  bookings,
  addBooking,
  removeBooking,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [personsList, setPersonsList] = useState<string[]>([]);
  const [person, setPerson] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Sync personsList whenever bookings change
  useEffect(() => {
    const unique = Array.from(new Set(bookings.map((b) => b.person)));
    setPersonsList(unique);
  }, [bookings]);

  // Calculate start of week (Sunday)
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - startOfWeek.getDay());

  // Build week dates and time slots
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const slots: Slot[] = Array.from({ length: 48 }).map((_, i) => {
    const hour24 = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { id: i, label: `${hour12}:${minute} ${ampm}` };
  });

  // Add new person to dropdown
  const handleAddPerson = () => {
    const name = newName.trim();
    if (name && !personsList.includes(name)) {
      setPersonsList((prev) => [...prev, name]);
      setPerson(name);
      setNewName('');
    }
  };

  // Toggle booking on click or drag
  const toggleBooking = useCallback(
    async (date: Date, slotIdx: number) => {
      if (!person) return;
      const dateStr = date.toISOString().split('T')[0];
      const exists = bookings.some(
        (b) => b.date === dateStr && b.slotIdx === slotIdx
      );

      if (exists) {
        // remove booking
        await removeBooking(dateStr, slotIdx);
      } else {
        // add booking
        await addBooking({ date: dateStr, slotIdx, person });
      }
    },
    [bookings, person, addBooking, removeBooking]
  );

  // Group contiguous slots into single blocks
  const grouped: Range[][] = weekDates.map((date) => {
    const key = date.toISOString().split('T')[0];
    const day = bookings
      .filter((b) => b.date === key)
      .sort((a, b) => a.slotIdx - b.slotIdx);
    const ranges: Range[] = [];
    day.forEach((b) => {
      const last = ranges[ranges.length - 1];
      if (last && last.person === b.person && b.slotIdx === last.end + 1) {
        last.end = b.slotIdx;
      } else {
        ranges.push({ start: b.slotIdx, end: b.slotIdx, person: b.person });
      }
    });
    return ranges;
  });

  // Week navigation and dragging
  const moveWeek = (offset: number) =>
    setSelectedDate(
      (d) => new Date(d.getTime() + offset * 7 * 24 * 60 * 60 * 1000)
    );
  const startDrag = () => setIsDragging(true);
  const endDrag = () => setIsDragging(false);

  const slotHeight = 32;

  return (
    <div className="p-4" onMouseUp={endDrag} onMouseLeave={endDrag}>
      {/* Week header */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => moveWeek(-1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Prev Week
        </button>
        <h2 className="text-lg font-semibold">
          Week of{' '}
          {startOfWeek.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </h2>
        <button
          onClick={() => moveWeek(1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Next Week
        </button>
      </div>

      {/* Person selector */}
      <div className="mb-4 flex space-x-2">
        <select
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Select Person</option>
          {personsList.map((n, i) => (
            <option key={i} value={n}>
              {n}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Add name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
          className="border px-2 py-1 rounded"
        />
        <button
          onClick={handleAddPerson}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Add
        </button>
      </div>

      {/* Calendar grid */}
      <div className="relative flex border-t border-l" onMouseDown={startDrag}>
        {/* Time labels column */}
        <div className="w-20 flex-shrink-0 border-r">
          <div className="h-8 border-b" />
          {slots.map((s) => (
            <div
              key={s.id}
              className="h-8 border-b text-right pr-2 text-sm text-gray-600"
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, di) => (
          <div key={di} className="flex-1 border-r relative">
            <div className="h-8 border-b bg-gray-50 text-center text-sm font-medium">
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
              })}
            </div>

            {/* Render booked ranges */}
            {grouped[di].map((r, ri) => (
              <div
                key={ri}
                className={`absolute left-0 right-0 border-4 ${
                  r.person === person
                    ? 'bg-blue-200 border-blue-500'
                    : 'bg-gray-200 border-gray-400'
                }`}
                style={{
                  top: (r.start + 1) * slotHeight,
                  height: (r.end - r.start + 1) * slotHeight,
                }}
                onClick={() => toggleBooking(date, r.start)}
              >
                <div
                  className="text-xs text-center text-gray-800"
                  style={{ lineHeight: `${slotHeight}px` }}
                >
                  {r.person}
                </div>
              </div>
            ))}

            {/* Clickable slot grid */}
            <div className="space-y-0">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className="h-8 border-b cursor-pointer relative"
                  onMouseDown={() => toggleBooking(date, s.id)}
                  onMouseEnter={() =>
                    isDragging && toggleBooking(date, s.id)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
