require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/assessment', require('./routes/assessment'));
app.use('/api/agencies', require('./routes/agencies'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/agency-auth', require('./routes/agency-auth'));
app.use('/api/portal', require('./routes/portal'));

// Serve React frontend in production
const clientBuild = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
