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
  'union-terrace': {
    name: 'Union Terrace',
    sheetName: 'Union Terrace',
    networkName: process.env.UNION_TERRACE_NETWORK,
    wifiPassword: process.env.UNION_TERRACE_PASSWORD,
    sessionExpiryDays: 7
  },

  'king-st': {
    name: 'King ST',
    sheetName: 'King ST',
    networkName: process.env.KING_ST_NETWORK,
    wifiPassword: process.env.KING_ST_PASSWORD,
    sessionExpiryDays: 7
  },

  'skene-st': {
    name: 'Skene ST',
    sheetName: 'Skene ST',
    networkName: process.env.SKENE_ST_NETWORK,
    wifiPassword: process.env.SKENE_ST_PASSWORD,
    sessionExpiryDays: 7
  },

  'fonthill-terrace': {
    name: 'Fonthill Terrace',
    sheetName: 'Fonthill Terrace',
    networkName: process.env.FONTHILL_TERRACE_NETWORK,
    wifiPassword: process.env.FONTHILL_TERRACE_PASSWORD,
    sessionExpiryDays: 7
  },

  'upperkirkgate': {
    name: 'Upperkirkgate',
    sheetName: 'Upperkirkgate',
    networkName: process.env.UPPERKIRKGATE_NETWORK,
    wifiPassword: process.env.UPPERKIRKGATE_PASSWORD,
    sessionExpiryDays: 7
  }
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

  return google.sheets({
    version: 'v4',
    auth
  });
}

function validProperty(propertyId) {
  return Object.prototype.hasOwnProperty.call(apartments, propertyId);
}

function expiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'wifi-registration-api'
  });
});

app.post('/api/register', async (req, res) => {
  try {
    const {
      propertyId,
      email,
      deviceName,
      marketing
    } = req.body;

    if (!validProperty(propertyId)) {
      return res.status(400).json({
        error: 'Please select a valid property.'
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    const config = apartments[propertyId];

    if (!config.networkName || !config.wifiPassword) {
      return res.status(500).json({
        error: 'WiFi credentials are not configured for this property.'
      });
    }

    const device = String(deviceName || 'Unknown device')
      .trim()
      .slice(0, 100);

    const registeredAt = new Date().toISOString();
    const expires = expiryDate(config.sessionExpiryDays);

    // Convert the checkbox value into a simple Yes/No value.
    const marketingChoice = marketing === true ? 'Yes' : 'No';

    const sheets = await getSheets();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${config.sheetName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          email.trim(),
          device,
          registeredAt,
          expires,
          'Active',
          marketingChoice
        ]]
      }
    });

    res.json({
      success: true,
      propertyId,
      propertyName: config.name,
      email: email.trim(),
      deviceName: device,
      networkName: config.networkName,
      wifiPassword: config.wifiPassword,
      expires
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Registration could not be completed.',
      details: err.message
    });
  }
});

app.get('/api/properties', (req, res) => {
  res.json({
    properties: Object.entries(apartments).map(([id, property]) => ({
      id,
      name: property.name
    }))
  });
});

app.listen(PORT, () => {
  console.log(`WiFi registration server listening on port ${PORT}`);
});
