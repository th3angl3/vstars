const express = require('express');
const app = express();

app.use(express.json());
app.use('/api', require('./routes/scrapeRoute'));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message });
});

module.exports = app;