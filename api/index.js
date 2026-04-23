import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    const { pathname, query } = new URL(req.url, `http://${req.headers.host}`);

    // 2. /api/set
    if (pathname.includes('/set')) {
        const { uid, state } = query;
        try {
            const stateObj = JSON.parse(state);
            const stateKey = Object.keys(stateObj)[0];
            const isTrue = stateObj[stateKey] === "true";

            if (isTrue) {
                await kv.hset('user_states', { [uid]: stateKey });
            } else {
                await kv.hdel('user_states', uid);
            }
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(400).json({ error: "Invalid JSON" });
        }
    }

    // 3. /api/get
    if (pathname.includes('/get')) {
        const allStates = await kv.hgetall('user_states') || {};
        const compiledStates = {};
        
        // Convert the UID map into your anonymous state object
        Object.values(allStates).forEach(stateKey => {
            compiledStates[stateKey] = "true";
        });
        
        return res.status(200).json(compiledStates);
    }

    // 4. /api/unload
    if (pathname.includes('/unload')) {
        const { uid } = query;
        if (uid) await kv.hdel('user_states', uid);
        return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: "Not Found" });
}
