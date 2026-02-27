require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const agencyRoutes = require('./routes/agencies');
const resourceRoutes = require('./routes/resources');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/resources', resourceRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
