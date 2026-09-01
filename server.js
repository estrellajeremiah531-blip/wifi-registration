const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const apartments = {
  'apt-101': { networkName: 'Apt101-Guest', wifiPassword: 'Welcome101!', sessionExpiryDays: 7 },
  'apt-102': { networkName: 'Apt102-Guest', wifiPassword: 'Welcome102!', sessionExpiryDays: 7 },
  'apt-103': { networkName: 'Apt103-Guest', wifiPassword: 'Welcome103!', sessionExpiryDays: 7 },
  'apt-104': { networkName: 'Apt104-Guest', wifiPassword: 'Welcome104!', sessionExpiryDays: 7 },
  'apt-105': { networkName: 'Apt105-Guest', wifiPassword: 'Welcome105!', sessionExpiryDays: 7 }
};

function getCredentials() {
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_CREDENTIALS is not set.');
  }
  return JSON.parse(process.env.GOOGLE_CREDENTIALS);
}

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

function validApartment(apt) {
  return Object.prototype.hasOwnProperty.call(apartments, apt);
}

function expiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'wifi-registration-api' });
});

app.get('/api/apartment/:apt', (req, res) => {
  const apt = req.params.apt;
  if (!validApartment(apt)) return res.status(404).json({ error: 'Apartment not found.' });
  res.json({ apartment: apt, ...apartments[apt] });
});

app.post('/api/register', async (req, res) => {
  try {
    const { apartment, email, deviceName } = req.body;

    if (!validApartment(apartment)) {
      return res.status(400).json({ error: 'Invalid apartment.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const device = String(deviceName || 'Unknown device').trim().slice(0, 100);
    const config = apartments[apartment];
    const registeredAt = new Date().toISOString();
    const expires = expiryDate(config.sessionExpiryDays);

    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${apartment}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[email.trim(), device, registeredAt, expires, 'Active']]
      }
    });

    res.json({
      success: true,
      apartment,
      email: email.trim(),
      deviceName: device,
      networkName: config.networkName,
      wifiPassword: config.wifiPassword,
      expires
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration could not be completed.', details: err.message });
  }
});

app.get('/api/admin/:apt/dashboard', async (req, res) => {
  try {
    const apt = req.params.apt;
    if (!validApartment(apt)) return res.status(404).json({ error: 'Apartment not found.' });

    const sheets = await getSheets();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${apt}!A:E`
    });

    const rows = result.data.values || [];
    res.json({
      apartment: apt,
      registrations: rows.slice(1).map(r => ({
        email: r[0] || '',
        deviceName: r[1] || '',
        registrationDate: r[2] || '',
        expires: r[3] || '',
        status: r[4] || ''
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard.', details: err.message });
  }
});

app.listen(PORT, () => console.log(`WiFi registration server listening on port ${PORT}`));
