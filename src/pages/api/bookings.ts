// File: src/pages/api/bookings.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Load credentials and initialize Sheets API client
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS!);
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_NAME = 'bookings';

// Simple in-memory cache for GET requests
let cache: { timestamp: number; data: string[][] } | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds

export default async function handler(
req: NextApiRequest,
res: NextApiResponse
) {
const { method, body } = req;

if (method === 'GET') {
const now = Date.now();
if (cache && now - cache.timestamp < CACHE_TTL) {
return res.status(200).json(cache.data);
}


const response = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SHEET_NAME}!A2:C1000`,
});
const rows = response.data.values || [];

cache = { timestamp: now, data: rows };
return res.status(200).json(rows);


}

if (method === 'POST') {
const { date, slotIdx, person } = body;
// Prevent double booking: check existing
const getRes = await sheets.spreadsheets.values.get({
spreadsheetId: SPREADSHEET_ID,
range: `${SHEET_NAME}!A2:B1000`,
});
const existing = (getRes.data.values || []).some(
row => row[0] === date && Number(row[1]) === slotIdx
);
if (existing) {
return res.status(409).json({ error: 'Slot already booked' });
}


await sheets.spreadsheets.values.append({
  spreadsheetId: SPREADSHEET_ID,
  range: `${SHEET_NAME}!A:C`,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [[date, slotIdx, person]] },
});
cache = null;
return res.status(201).json({ date, slotIdx, person });


}

if (method === 'DELETE') {
const { date, slotIdx } = body;
// Fetch current rows
const getRes = await sheets.spreadsheets.values.get({
spreadsheetId: SPREADSHEET_ID,
range: `${SHEET_NAME}!A2:B1000`,
});
const rows = getRes.data.values || [];


const rowIndex = rows.findIndex(
  r => r[0] === date && Number(r[1]) === slotIdx
);
if (rowIndex === -1) {
  return res.status(404).json({ error: 'Booking not found' });
}
const sheetRow = rowIndex + 2; // account for header row

// Delete the row via batchUpdate
// Look up sheetId dynamically
const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
const sheetMeta = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
const sheetId = sheetMeta?.properties?.sheetId;

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SPREADSHEET_ID,
  requestBody: {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: sheetId || 0,
            dimension: 'ROWS',
            startIndex: sheetRow - 1,
            endIndex: sheetRow,
          }
        }
      }
    ]
  }
});

cache = null;
return res.status(204).end();

}

res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
return res.status(405).end(`Method ${method} Not Allowed`);
}
