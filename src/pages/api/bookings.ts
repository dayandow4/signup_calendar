import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Load service account credentials
const KEYFILEPATH = path.join(process.cwd(), 'google-credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SHEET_ID!; // set in .env.local
const SHEET_NAME = 'bookings';

async function readBookings(weekStart: string) {
  // Fetch all rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:D",
  });
  const rows = res.data.values || [];
  // Map to objects and filter by weekStart
  return rows
    .map(r => ({ id: r[3], date: r[0], slotIdx: Number(r[1]), person: r[2] }))
    .filter(record => record.date === weekStart);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  if (method === 'GET') {
    const { weekStart } = req.query;
    const bookings = await readBookings(weekStart as string);
    return res.status(200).json(bookings);
  }

  if (method === 'POST') {
    const { date, slotIdx, person, id } = req.body;
    // Append a new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[date, slotIdx, person, id]] },
    });
    return res.status(201).json({ date, slotIdx, person, id });
  }

  if (method === 'DELETE') {
    const { id } = req.body;
    // Find row index by id
    const resAll = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });
    const rows = resAll.data.values || [];
    const rowIndex = rows.findIndex(r => r[3] === id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Not found' });
    // Delete by clearing the row
    const idx = rowIndex + 2; // account for header row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${idx}:D${idx}`,
    });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET','POST','DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}