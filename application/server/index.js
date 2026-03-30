const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint to get wealth data
app.get('/api/wealth', (req, res) => {
    const dataPath = path.join(__dirname, '../data/data.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data:', err);
            return res.status(500).json({ error: 'Failed to read data' });
        }
        try {
            const parsedData = JSON.parse(data);
            res.json(parsedData);
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.status(500).json({ error: 'Failed to parse data' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running! Access the app at http://localhost:${PORT}`);
});
