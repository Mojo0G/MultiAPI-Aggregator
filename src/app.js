const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'multi-api-aggregator' });
});
app.use('/', apiRoutes);

app.use(errorHandler);

module.exports = app;
