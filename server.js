const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8847;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import & Mount Route Modules
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/configurations', require('./routes/configurations'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api', require('./routes/audit'));
app.use('/api/email', require('./routes/email'));

// Start Server
app.listen(PORT, () => {
  console.log(`ClaimIT Server running on port ${PORT}`);
});
