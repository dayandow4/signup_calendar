// File: src/pages/api/bookings.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Step 3: Load credentials from env instead of a JSON file on disk
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS!);
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SHEET_ID!;
const SHEET_NAME = 'bookings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body, query } = req;

  if (method === 'GET') {
    const weekStart = query.weekStart as string;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });
    const rows = response.data.values || [];
    // parse and filter rows for the requested week
    // ...
    return res.status(200).json(/* filtered rows */);
  }

  if (method === 'POST') {
    const { date, slotIdx, person, id } = body;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[date, slotIdx, person, id]] },
    });
    return res.status(201).json({ date, slotIdx, person, id });
  }

  if (method === 'DELETE') {
    const { id } = body;
    // find and clear the row by id
    // ...
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
