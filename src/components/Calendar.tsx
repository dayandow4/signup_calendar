// File: src/components/Calendar.tsx

'use client';
import { useState, useCallback } from 'react';

type Slot = { id: number; label: string };
type Booking = { person: string; key: string };
type Range = { start: number; end: number; person: string };

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [personsList, setPersonsList] = useState<string[]>([]);
  const [person, setPerson] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Calculate start of week (Sunday)
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - startOfWeek.getDay());

  // Week dates
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  // 30-minute slots
  const slots: Slot[] = Array.from({ length: 48 }).map((_, i) => {
    const hour24 = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { id: i, label: `${hour12}:${minute} ${ampm}` };
  });

  // Add new person
  const handleAddPerson = () => {
    const name = newName.trim();
    if (name && !personsList.includes(name)) {
      setPersonsList(prev => [...prev, name]);
      setPerson(name);
      setNewName('');
    }
  };

  // Toggle booking for a slot, including removal
  const toggleBooking = useCallback((date: Date, slotIdx: number) => {
    if (!person) return;
    const key = `${date.toDateString()}|${slotIdx}`;
    setBookings(prev => {
      const index = prev.findIndex(b => b.key === key);
      if (index !== -1) {
        // Remove booking if it's by the selected person
        if (prev[index].person === person) {
          const copy = [...prev];
          copy.splice(index, 1);
          return copy;
        }
        // Otherwise do nothing
        return prev;
      }
      // Add new booking
      const next = [...prev, { person, key }];
      if (!personsList.includes(person)) setPersonsList(pl => [...pl, person]);
      return next;
    });
  }, [person, personsList]);

  // Group bookings into ranges per day
  const grouped: Range[][] = weekDates.map(date => {
    const dateKey = date.toDateString();
    const dayBookings = bookings
      .filter(b => b.key.startsWith(dateKey))
      .map(b => ({ idx: parseInt(b.key.split('|')[1], 10), person: b.person }))
      .sort((a, b) => a.idx - b.idx);

    const ranges: Range[] = [];
    dayBookings.forEach(({ idx, person: p }) => {
      const last = ranges[ranges.length - 1];
      if (last && last.person === p && idx === last.end + 1) {
        last.end = idx;
      } else {
        ranges.push({ start: idx, end: idx, person: p });
      }
    });
    return ranges;
  });

  // Week navigation
  const moveWeek = (offset: number) =>
    setSelectedDate(d => new Date(d.getTime() + offset * 7 * 24 * 60 * 60 * 1000));

  // Drag handlers
  const startDrag = () => setIsDragging(true);
  const endDrag = () => setIsDragging(false);

  const slotHeight = 32; // px height of each slot

  return (
    <div className="p-4" onMouseUp={endDrag} onMouseLeave={endDrag}>
      {/* Week navigation */}
      <div className="mb-4 flex justify-between items-center">
        <button onClick={() => moveWeek(-1)} className="px-3 py-1 bg-gray-200 rounded">
          Prev Week
        </button>
        <h2 className="text-lg font-semibold">
          Week of {startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </h2>
        <button onClick={() => moveWeek(1)} className="px-3 py-1 bg-gray-200 rounded">
          Next Week
        </button>
      </div>

      {/* Person selector */}
      <div className="mb-4 flex space-x-2">
        <select
          value={person}
          onChange={e => setPerson(e.target.value)}
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
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
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
        {/* Time labels */}
        <div className="w-20 flex-shrink-0 border-r">
          <div className="h-8 border-b" />
          {slots.map(s => (
            <div
              key={s.id}
              className="h-8 border-b text-right pr-2 text-sm text-gray-600"
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Day columns with merged ranges */}
        {weekDates.map((date, di) => (
          <div key={di} className="flex-1 border-r relative">
            {/* Day header */}
            <div className="h-8 border-b bg-gray-50 text-center text-sm font-medium">
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
              })}
            </div>

            {/* Merged booking ranges */}
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
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickedSlot = r.start + Math.floor(clickY / slotHeight);
                  toggleBooking(date, clickedSlot);
                }}
              >
                <div
                  className="text-xs text-center text-gray-800"
                  style={{ lineHeight: `${slotHeight}px` }}
                >
                  {r.person}
                </div>
              </div>
            ))}

            {/* Transparent overlays for interactions */}
            <div className="space-y-0">
              {slots.map(s => (
                <div
                  key={s.id}
                  className="h-8 border-b cursor-pointer relative"
                  onMouseDown={() => toggleBooking(date, s.id)}
                  onMouseEnter={() => isDragging && toggleBooking(date, s.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
