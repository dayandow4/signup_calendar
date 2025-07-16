// File: src/components/Calendar.tsx

'use client';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Slot = { id: number; label: string };
type Booking = { id: string; date: string; slotIdx: number; person: string };
type Range = { start: number; end: number; person: string; id: string };

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

  // Fetch bookings for the week
  useEffect(() => {
    const fetchData = async () => {
      const weekStartStr = startOfWeek.toISOString().split('T')[0];
      const res = await fetch(`/api/bookings?weekStart=${weekStartStr}`);
      const data: Booking[] = await res.json();
      setBookings(data);
      const uniquePersons = Array.from(new Set(data.map(b => b.person)));
      setPersonsList(uniquePersons);
    };
    fetchData();
  }, [startOfWeek]);

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

  // Toggle booking: POST or DELETE
  const toggleBooking = useCallback(async (date: Date, slotIdx: number) => {
    if (!person) return;
    const dateStr = date.toISOString().split('T')[0];
    const existing = bookings.find(b => b.date === dateStr && b.slotIdx === slotIdx);
    if (existing) {
      if (existing.person === person) {
        await fetch('/api/bookings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existing.id }) });
      }
    } else {
      const newBooking = { id: uuidv4(), date: dateStr, slotIdx, person };
      await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBooking) });
    }
    // Refresh
    const weekStartStr = startOfWeek.toISOString().split('T')[0];
    const res = await fetch(`/api/bookings?weekStart=${weekStartStr}`);
    const data: Booking[] = await res.json();
    setBookings(data);
  }, [person, bookings, startOfWeek]);

  // Group bookings into ranges
  const grouped: Range[][] = weekDates.map(date => {
    const dateKey = date.toISOString().split('T')[0];
    const dayBookings = bookings
      .filter(b => b.date === dateKey)
      .sort((a, b) => a.slotIdx - b.slotIdx);
    const ranges: Range[] = [];
    dayBookings.forEach(b => {
      const last = ranges[ranges.length - 1];
      if (last && last.person === b.person && b.slotIdx === last.end + 1) {
        last.end = b.slotIdx;
      } else {
        ranges.push({ start: b.slotIdx, end: b.slotIdx, person: b.person, id: b.id });
      }
    });
    return ranges;
  });

  // Week navigation
  const moveWeek = (offset: number) => setSelectedDate(d => new Date(d.getTime() + offset * 7 * 24 * 60 * 60 * 1000));

  // Drag handlers
  const startDrag = () => setIsDragging(true);
  const endDrag = () => setIsDragging(false);

  const slotHeight = 32;

  return (
    <div className="p-4" onMouseUp={endDrag} onMouseLeave={endDrag}>
      <div className="mb-4 flex justify-between items-center">
        <button onClick={() => moveWeek(-1)} className="px-3 py-1 bg-gray-200 rounded">Prev Week</button>
        <h2 className="text-lg font-semibold">Week of {startOfWeek.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</h2>
        <button onClick={() => moveWeek(1)} className="px-3 py-1 bg-gray-200 rounded">Next Week</button>
      </div>

      <div className="mb-4 flex space-x-2">
        <select value={person} onChange={e => setPerson(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">Select Person</option>
          {personsList.map((n,i)=><option key={i} value={n}>{n}</option>)}
        </select>
        <input type="text" placeholder="Add name" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddPerson()} className="border px-2 py-1 rounded" />
        <button onClick={handleAddPerson} className="px-2 py-1 bg-blue-500 text-white rounded">Add</button>
      </div>

      <div className="relative flex border-t border-l" onMouseDown={startDrag}>
        <div className="w-20 flex-shrink-0 border-r">
          <div className="h-8 border-b" />
          {slots.map(s=><div key={s.id} className="h-8 border-b text-right pr-2 text-sm text-gray-600">{s.label}</div>)}
        </div>
        {weekDates.map((date,di)=>(
          <div key={di} className="flex-1 border-r relative">
            <div className="h-8 border-b bg-gray-50 text-center text-sm font-medium">
              {date.toLocaleDateString(undefined,{weekday:'short',month:'numeric',day:'numeric'})}
            </div>
            {grouped[di].map((r,ri)=>(
              <div key={ri} className={`absolute left-0 right-0 border-4 ${r.person===person?'bg-blue-200 border-blue-500':'bg-gray-200 border-gray-400'}`} style={{top:(r.start+1)*slotHeight,height:(r.end-r.start+1)*slotHeight}} onClick={e=>{
                const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
                const clickY=e.clientY-rect.top;
                const clickedSlot=r.start+Math.floor(clickY/slotHeight);
                toggleBooking(date,clickedSlot);
              }}>
                <div className="text-xs text-center text-gray-800" style={{lineHeight:`${slotHeight}px`}}>{r.person}</div>
              </div>
            ))}
            <div className="space-y-0">
              {slots.map(s=><div key={s.id} className="h-8 border-b cursor-pointer relative" onMouseDown={()=>toggleBooking(date,s.id)} onMouseEnter={()=>isDragging&&toggleBooking(date,s.id)}/>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}