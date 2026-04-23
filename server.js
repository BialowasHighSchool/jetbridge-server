const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'states.json');

// --- Persistence Helpers ---

// Load data on startup
let userStates = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE);
        userStates = JSON.parse(rawData);
        console.log("Data restored from disk.");
    } catch (e) {
        console.error("Could not parse data file, starting fresh.");
        userStates = {};
    }
}

// Save data to disk
const saveToDisk = () => {
    fs.writeFile(DATA_FILE, JSON.stringify(userStates, null, 2), (err) => {
        if (err) console.error("Error saving data:", err);
    });
};

// --- Server Logic ---

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    res.setHeader('Content-Type', 'application/json');

    // 1. /set
    if (pathname === '/set') {
        const { uid, state } = query;
        try {
            const stateObj = JSON.parse(state);
            const stateKey = Object.keys(stateObj)[0];
            const isTrue = stateObj[stateKey] === "true";

            if (uid && stateKey) {
                if (isTrue) {
                    userStates[uid] = stateKey;
                    console.log(`Setting state: ${stateKey} for ${uid}`);
                } else {
                    delete userStates[uid];
                    console.log(`Deleting state for: ${uid}`);
                }
                saveToDisk(); // Save changes
                return res.end(JSON.stringify({ success: true }));
            }
        } catch (e) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
    }

    // 2. /get
    if (pathname === '/get') {
        const compiledStates = {};
        Object.values(userStates).forEach(stateKey => {
            compiledStates[stateKey] = "true";
        });
        return res.end(JSON.stringify(compiledStates));
    }

    // 3. /unload
    if (pathname === '/unload') {
        const { uid } = query;
        if (uid && userStates[uid]) {
            delete userStates[uid];
            saveToDisk(); // Save changes
        }
        return res.end(JSON.stringify({ success: true }));
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not Found" }));
});

// Note: Running on port 80 usually requires sudo/admin privileges
server.listen(80, () => console.log('Server running on port 80. Data is persistent.'));
