# WiFi Registration System

Free 5-apartment version using Node.js, Google Sheets, Render, and Vercel.

Apartments:
- apt-101
- apt-102
- apt-103
- apt-104
- apt-105

## Backend
1. Rename `.env.example` to `.env`.
2. Set `GOOGLE_SPREADSHEET_ID`.
3. Set `GOOGLE_CREDENTIALS` to the complete service-account JSON on one line.
4. Run `npm install`.
5. Run `npm start`.

## Frontend
The same `index.html` can be hosted separately on Vercel. After the Render backend is live,
change `API_BASE` near the bottom of `index.html` from localhost to your Render URL.

Example:
`https://your-render-service.onrender.com`

## Apartment URLs
`/?apt=apt-101`
through
`/?apt=apt-105`

## Google Sheets
Create a spreadsheet with tabs named exactly:
apt-101, apt-102, apt-103, apt-104, apt-105

Each tab should have:
Email | Device Name | Registration Date | Expires | Status

## Important
The guide supplied with this project says Gmail email delivery is part of the desired setup, but
its later notes state that this free version does not actually send emails yet. This recreated
version therefore records registrations and displays credentials; it does not claim to send email.
