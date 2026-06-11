require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const http = require('http');
const { Server } = require('socket.io');

// File saving modules
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" })); 

// Ensure 'uploads' folder exists on your directory automatically
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Custom storage to keep original filename and extensions
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Appends timestamp to avoid file overwriting
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000" } 
});

const JWT_SECRET = process.env.JWT_SECRET || "JUT_BTECH_SECRET_KEY_2026";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ==========================================
// 1. HOME HEALTH CHECK ROUTE
// ==========================================
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "Online", 
        message: "DMS Backend Local Storage System with Search & Tagging is active!",
        timestamp: new Date()
    });
});

// ==========================================
// 2. TESTING TOKEN GENERATOR ROUTE
// ==========================================
app.get('/api/test-token', (req, res) => {
    const payload = { id: 1 }; 
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ 
        message: "Token generated", 
        token: `Bearer ${token}` 
    });
});

// Socket.io Setup
io.on('connection', (socket) => {
    socket.on('join_document_room', (documentId) => {
        socket.join(documentId.toString());
    });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user;
        next();
    });
};

// =======================================================================
// 3. REAL LOCAL UPLOAD ROUTE (Saves Content, Version, Filename & Tags)
// =======================================================================
app.post('/api/documents/upload-url', authenticateToken, upload.single('file'), async (req, res) => {
    const documentId = req.body.documentId || 101; 
    const parsedDocumentId = parseInt(documentId, 10);
    const parsedUserId = parseInt(req.user.id, 10);
    
    // Catch filename and tags from incoming multipart form-data
    const tags = req.body.tags || "General";
    const fileName = req.file ? req.file.originalname : "unnamed_file";

    try {
        // Query 1: Access Verification
        const permCheck = await pool.query(
            `SELECT access_type FROM access_control WHERE document_id = $1 AND user_id = $2`,
            [parsedDocumentId, parsedUserId]
        );
        
        if (permCheck.rows.length === 0 || permCheck.rows[0].access_type === 'VIEWER') {
            return res.status(403).json({ error: "Access Denied" });
        }

        // Query 2: Version Increment, Filename Update & Tag Sync
        const docQuery = await pool.query(
            `UPDATE documents 
            SET current_version = current_version + 1, 
                file_name = $1, 
                tags = $2, 
                updated_at = NOW() 
            WHERE id = $3 RETURNING current_version`,
            [fileName, tags, parsedDocumentId]
        );

        if (docQuery.rows.length === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        const nextVersion = docQuery.rows[0].current_version;

        // Query 3: Audit Log Insertion
        await pool.query(
            `INSERT INTO audit_logs (document_id, user_id, action, ip_address) VALUES ($1, $2, 'LOCAL_UPLOAD', $3)`,
            [parsedDocumentId, parsedUserId, req.ip || '127.0.0.1']
        );

        // Real-time Socket Alert
        io.to(parsedDocumentId.toString()).emit('document_updated', {
            message: `A new version (v${nextVersion}) was uploaded locally with tags: ${tags}!`,
            version: nextVersion,
            updatedBy: parsedUserId
        });

        // Response confirmation
        res.status(200).json({ 
            success: true,
            message: "File successfully saved on your computer and sync with db!",
            allocatedVersion: nextVersion,
            localPath: req.file ? req.file.path : "No file written"
        });

    } catch (error) {
        console.error("🔴 BACKEND ERROR:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

// =======================================================================
// 4. ADVANCED SEARCH & TAGGING FILTER ROUTE (Case-Insensitive)
// =======================================================================
app.get('/api/documents/search', authenticateToken, async (req, res) => {
    const { query } = req.query; // Capture search text from frontend query param

    try {
        // Matches search query inside file_name OR tags columns flexibly
        const searchQuery = `
            SELECT id, current_version, file_name, tags, updated_at 
            FROM documents 
            WHERE file_name ILIKE $1 OR tags ILIKE $1
        `;
        const result = await pool.query(searchQuery, [`%${query}%`]);
        
        res.status(200).json({ success: true, results: result.rows });
    } catch (error) {
        console.error("🔍 SEARCH ERROR:", error);
        res.status(500).json({ error: "Search failed", message: error.message });
    }
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
    console.log(`DMS Local-Storage & Search Server running on port ${PORT}`);
});