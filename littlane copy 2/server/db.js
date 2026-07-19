const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sales.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
            orderId TEXT PRIMARY KEY,
            event TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            gender TEXT,
            quantity INTEGER,
            amount REAL,
            currency TEXT,
            status TEXT,
            paymentId TEXT,
            ticketId TEXT,
            emailStatus TEXT,
            emailError TEXT,
            errorLog TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            paidAt TEXT,
            generatedAt TEXT,
            scannedBy TEXT,
            scannedAt TEXT
        )
    `);
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Convert DB row to domain record format
function parseRecord(row) {
    if (!row) return null;
    return {
        ...row,
        errorLog: row.errorLog ? JSON.parse(row.errorLog) : []
    };
}

async function createSaleRecord(record) {
    const sql = `
        INSERT INTO sales (
            orderId, event, name, email, phone, gender, quantity, amount, currency, status,
            paymentId, ticketId, emailStatus, emailError, errorLog, createdAt, updatedAt, paidAt, generatedAt, scannedBy, scannedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        record.orderId, record.event, record.name, record.email, record.phone, record.gender, record.quantity, record.amount, record.currency, record.status,
        record.paymentId, record.ticketId, record.emailStatus, record.emailError, JSON.stringify(record.errorLog || []), record.createdAt, record.updatedAt || record.createdAt,
        record.paidAt, record.generatedAt, record.scannedBy, record.scannedAt
    ];
    await run(sql, params);
    return record;
}

async function updateSaleRecord(orderId, updates) {
    const existing = await getByOrderId(orderId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const sql = `
        UPDATE sales SET
            event = ?, name = ?, email = ?, phone = ?, gender = ?, quantity = ?, amount = ?, currency = ?, status = ?,
            paymentId = ?, ticketId = ?, emailStatus = ?, emailError = ?, errorLog = ?, updatedAt = ?, paidAt = ?, generatedAt = ?,
            scannedBy = ?, scannedAt = ?
        WHERE orderId = ?
    `;
    const params = [
        merged.event, merged.name, merged.email, merged.phone, merged.gender, merged.quantity, merged.amount, merged.currency, merged.status,
        merged.paymentId, merged.ticketId, merged.emailStatus, merged.emailError, JSON.stringify(merged.errorLog || []), new Date().toISOString(),
        merged.paidAt, merged.generatedAt, merged.scannedBy, merged.scannedAt,
        orderId
    ];
    await run(sql, params);
    return merged;
}

async function getByOrderId(orderId) {
    const row = await get('SELECT * FROM sales WHERE orderId = ?', [orderId]);
    return parseRecord(row);
}

async function getByTicketId(ticketId) {
    const row = await get('SELECT * FROM sales WHERE ticketId = ?', [ticketId]);
    return parseRecord(row);
}

async function getAll() {
    const rows = await all('SELECT * FROM sales ORDER BY createdAt DESC');
    return rows.map(parseRecord);
}

module.exports = {
    createSaleRecord,
    updateSaleRecord,
    getByOrderId,
    getByTicketId,
    getAll,
    get,
    all,
    run
};
