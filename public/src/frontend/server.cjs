const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(__dirname));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`SMS Frontend running at http://localhost:${PORT}`);
    console.log(`Access the customer page at: http://localhost:${PORT}/customers`);
});