const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000; // Hardcoded to 3000 as per guidelines

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

const DATA_PATH = path.join(__dirname, '../data/data.json');

// API Endpoint to get wealth data
app.get('/api/wealth', (req, res) => {
    fs.readFile(DATA_PATH, 'utf8', (err, data) => {
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

// API Endpoint to save wealth data
app.post('/api/wealth', (req, res) => {
    const newData = req.body;
    fs.writeFile(DATA_PATH, JSON.stringify(newData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing data:', err);
            return res.status(500).json({ error: 'Failed to save data' });
        }
        res.json({ success: true });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running! Access the app at http://localhost:${PORT}`);
});
