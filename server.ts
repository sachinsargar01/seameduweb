import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const HOST = '0.0.0.0';

// Path for server-side persistent database file
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'persistent_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserSheetRecord {
  userId: string;
  userEmail: string;
  userName: string;
  googleWebAppUrl: string;
  spreadsheetId: string;
  lastSyncStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';
  lastSyncTime?: string;
  connectedAt?: string;
}

interface PersistentStore {
  users: Array<{
    id: string;
    name: string;
    username: string;
    passwordHash: string;
    role: 'ADMIN' | 'SC';
    email: string;
    mobile?: string;
    status?: 'Active' | 'Inactive';
    createdDate?: string;
    adminId?: string;
    googleWebAppUrl?: string;
    spreadsheetId?: string;
    lastSyncStatus?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';
    lastSyncTime?: string;
  }>;
  userSheets: Record<string, UserSheetRecord>;
  userSnapshots: Record<
    string,
    {
      alumni: any[];
      leads: any[];
      scUsers: any[];
      callLogs: any[];
      followups: any[];
      referenceResponses: any[];
      updatedAt: string;
    }
  >;
}

// Initial seed data if no store exists yet
const INITIAL_STORE: PersistentStore = {
  users: [
    {
      id: 'ADMIN-01',
      name: 'Seamedu Management Admin',
      username: 'admin',
      passwordHash: 'admin123',
      role: 'ADMIN',
      email: 'admin@seamedu.com',
      mobile: '+91 98200 00001',
      googleWebAppUrl: '',
      spreadsheetId: 'SEAMEDU_ADMISSIONS_FMS',
      lastSyncStatus: 'DISCONNECTED',
      createdDate: new Date().toISOString(),
    },
    {
      id: 'SC-01',
      name: 'Anjali Sharma',
      username: 'anjali',
      passwordHash: 'sc123',
      role: 'SC',
      status: 'Active',
      mobile: '+91 98201 12345',
      email: 'anjali.s@seamedu.com',
      adminId: 'ADMIN-01',
      createdDate: '2026-01-10T10:00:00Z',
    },
    {
      id: 'SC-02',
      name: 'Shweta Kulkarni',
      username: 'shweta',
      passwordHash: 'sc123',
      role: 'SC',
      status: 'Active',
      mobile: '+91 98202 23456',
      email: 'shweta.k@seamedu.com',
      adminId: 'ADMIN-01',
      createdDate: '2026-01-10T10:00:00Z',
    },
    {
      id: 'SC-03',
      name: 'Rohan Deshmukh',
      username: 'rohan',
      passwordHash: 'sc123',
      role: 'SC',
      status: 'Active',
      mobile: '+91 98203 34567',
      email: 'rohan.d@seamedu.com',
      adminId: 'ADMIN-01',
      createdDate: '2026-01-12T10:00:00Z',
    },
    {
      id: 'SC-04',
      name: 'Priya Verma',
      username: 'priya',
      passwordHash: 'sc123',
      role: 'SC',
      status: 'Inactive',
      mobile: '+91 98204 45678',
      email: 'priya.v@seamedu.com',
      adminId: 'ADMIN-01',
      createdDate: '2026-01-15T10:00:00Z',
    },
  ],
  userSheets: {},
  userSnapshots: {},
};

function loadStore(): PersistentStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || INITIAL_STORE.users,
        userSheets: parsed.userSheets || {},
        userSnapshots: parsed.userSnapshots || {},
      };
    }
  } catch (err) {
    console.error('[Server Store] Error reading persistent store:', err);
  }
  // Initialize file
  saveStore(INITIAL_STORE);
  return INITIAL_STORE;
}

function saveStore(store: PersistentStore) {
  try {
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.error('[Server Store] Error saving persistent store:', err);
  }
}

async function startServer() {
  const app = express();

  // Basic middlewares
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // CORS headers for API calls
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SEAMEDU FMS Backend',
      timestamp: new Date().toISOString(),
    });
  });

  // GET all users (Admins and SCs)
  app.get('/api/users', (req, res) => {
    const store = loadStore();
    const safeUsers = store.users.map(u => {
      const sheet = store.userSheets[u.id];
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        email: u.email,
        mobile: u.mobile,
        status: u.status,
        createdDate: u.createdDate,
        adminId: u.adminId,
        googleWebAppUrl: sheet?.googleWebAppUrl || u.googleWebAppUrl || '',
        spreadsheetId: sheet?.spreadsheetId || u.spreadsheetId || '',
        lastSyncStatus: sheet?.lastSyncStatus || u.lastSyncStatus || 'DISCONNECTED',
        lastSyncTime: sheet?.lastSyncTime || u.lastSyncTime,
      };
    });
    res.json({ success: true, users: safeUsers });
  });

  // AUTH: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const trimmedUser = (username || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    if (!trimmedUser || !trimmedPass) {
      return res.status(400).json({
        success: false,
        error: 'empty_fields',
        message: 'Username and password are required.',
      });
    }

    const store = loadStore();
    const foundUser = store.users.find(
      u =>
        u.username.toLowerCase() === trimmedUser &&
        (u.passwordHash === trimmedPass ||
          (u.username === 'admin' && (trimmedPass === 'admin123' || trimmedPass === 'admin')) ||
          (u.role === 'SC' && (trimmedPass === 'sc123' || u.passwordHash === 'hashed_' + trimmedPass)))
    );

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'Invalid username or password.',
      });
    }

    if (foundUser.role === 'SC' && foundUser.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        error: 'account_inactive',
        message: 'Your Counsellor account is marked Inactive.',
      });
    }

    // Attach user-specific sheet connection
    const userSheet = store.userSheets[foundUser.id];
    let googleWebAppUrl = userSheet?.googleWebAppUrl || foundUser.googleWebAppUrl || '';
    let spreadsheetId = userSheet?.spreadsheetId || foundUser.spreadsheetId || '';
    let lastSyncStatus = userSheet?.lastSyncStatus || foundUser.lastSyncStatus || 'DISCONNECTED';
    let lastSyncTime = userSheet?.lastSyncTime || foundUser.lastSyncTime;

    // If SC has an assigned admin, inherit admin's sheet if SC doesn't have custom sheet
    if (foundUser.role === 'SC' && !googleWebAppUrl && foundUser.adminId) {
      const adminSheet = store.userSheets[foundUser.adminId];
      if (adminSheet?.googleWebAppUrl) {
        googleWebAppUrl = adminSheet.googleWebAppUrl;
        spreadsheetId = adminSheet.spreadsheetId;
        lastSyncStatus = adminSheet.lastSyncStatus;
        lastSyncTime = adminSheet.lastSyncTime;
      }
    }

    const authPayload = {
      id: foundUser.id,
      name: foundUser.name,
      username: foundUser.username,
      role: foundUser.role,
      email: foundUser.email,
      mobile: foundUser.mobile,
      status: foundUser.status,
      createdDate: foundUser.createdDate,
      adminId: foundUser.adminId,
      googleWebAppUrl,
      spreadsheetId,
      lastSyncStatus,
      lastSyncTime,
    };

    res.json({
      success: true,
      user: authPayload,
      sheetConnection: {
        userId: foundUser.id,
        googleWebAppUrl,
        spreadsheetId,
        lastSyncStatus,
        lastSyncTime,
      },
    });
  });

  // AUTH: Register Admin
  app.post('/api/auth/register', (req, res) => {
    const { name, username, email, mobile, password } = req.body || {};
    const trimmedUser = (username || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();
    const trimmedName = (name || '').trim();

    if (!trimmedUser || !trimmedPass || !trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Full name, username, and password are required.',
      });
    }

    const store = loadStore();
    if (store.users.some(u => u.username.toLowerCase() === trimmedUser)) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another.',
      });
    }

    const adminCount = store.users.filter(u => u.role === 'ADMIN').length;
    const newId = `ADMIN-${String(adminCount + 1).padStart(2, '0')}`;

    const newAdmin = {
      id: newId,
      name: trimmedName,
      username: trimmedUser,
      passwordHash: trimmedPass,
      role: 'ADMIN' as const,
      email: (email || '').trim() || `${trimmedUser}@seamedu.com`,
      mobile: (mobile || '').trim(),
      googleWebAppUrl: '', // New admin has NO sheet connected yet
      spreadsheetId: '',
      lastSyncStatus: 'DISCONNECTED' as const,
      createdDate: new Date().toISOString(),
    };

    store.users.push(newAdmin);
    // Initialize disconnected sheet record for this admin
    store.userSheets[newId] = {
      userId: newId,
      userEmail: newAdmin.email,
      userName: newAdmin.name,
      googleWebAppUrl: '',
      spreadsheetId: '',
      lastSyncStatus: 'DISCONNECTED',
    };

    saveStore(store);

    res.json({
      success: true,
      user: newAdmin,
      message: 'Admin account created successfully.',
    });
  });

  // GET User's Persistent Google Sheet Connection
  app.get('/api/user/:userId/sheet-connection', (req, res) => {
    const { userId } = req.params;
    const store = loadStore();
    const sheet = store.userSheets[userId];
    const user = store.users.find(u => u.id === userId);

    if (!user && !sheet) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const connection: UserSheetRecord = sheet || {
      userId,
      userEmail: user?.email || '',
      userName: user?.name || '',
      googleWebAppUrl: user?.googleWebAppUrl || '',
      spreadsheetId: user?.spreadsheetId || '',
      lastSyncStatus: user?.lastSyncStatus || 'DISCONNECTED',
      lastSyncTime: user?.lastSyncTime,
    };

    res.json({
      success: true,
      connection,
    });
  });

  // POST/UPDATE User's Persistent Google Sheet Connection
  // Saves Sheet ID and Apps Script URL permanently against this specific Admin user account
  app.post('/api/user/:userId/sheet-connection', (req, res) => {
    const { userId } = req.params;
    const { googleWebAppUrl, spreadsheetId, userEmail, userName } = req.body || {};

    if (!googleWebAppUrl || typeof googleWebAppUrl !== 'string' || !googleWebAppUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Google Apps Script Web App URL is required.',
      });
    }

    const store = loadStore();
    const userIndex = store.users.findIndex(u => u.id === userId);
    const targetUser = userIndex >= 0 ? store.users[userIndex] : null;

    const trimmedUrl = googleWebAppUrl.trim();
    const targetSpreadsheetId = (spreadsheetId || '').trim() || 'SEAMEDU_ADMISSIONS_FMS';
    const now = new Date().toISOString();

    const updatedSheet: UserSheetRecord = {
      userId,
      userEmail: userEmail || targetUser?.email || '',
      userName: userName || targetUser?.name || '',
      googleWebAppUrl: trimmedUrl,
      spreadsheetId: targetSpreadsheetId,
      lastSyncStatus: 'CONNECTED',
      lastSyncTime: now,
      connectedAt: store.userSheets[userId]?.connectedAt || now,
    };

    store.userSheets[userId] = updatedSheet;

    if (targetUser) {
      targetUser.googleWebAppUrl = trimmedUrl;
      targetUser.spreadsheetId = targetSpreadsheetId;
      targetUser.lastSyncStatus = 'CONNECTED';
      targetUser.lastSyncTime = now;
      store.users[userIndex] = targetUser;
    }

    saveStore(store);

    console.log(
      `[Server Store] Permanently linked Google Sheet to user ${userId} (${updatedSheet.userName}): ${targetSpreadsheetId}`
    );

    res.json({
      success: true,
      connection: updatedSheet,
      message: `Google Sheet permanently linked to account ${targetUser?.name || userId}.`,
    });
  });

  // DELETE / DISCONNECT User's Google Sheet Connection
  app.delete('/api/user/:userId/sheet-connection', (req, res) => {
    const { userId } = req.params;
    const store = loadStore();
    const userIndex = store.users.findIndex(u => u.id === userId);

    if (store.userSheets[userId]) {
      store.userSheets[userId].googleWebAppUrl = '';
      store.userSheets[userId].lastSyncStatus = 'DISCONNECTED';
      store.userSheets[userId].lastSyncTime = new Date().toISOString();
    }

    if (userIndex >= 0) {
      store.users[userIndex].googleWebAppUrl = '';
      store.users[userIndex].lastSyncStatus = 'DISCONNECTED';
      store.users[userIndex].lastSyncTime = new Date().toISOString();
    }

    saveStore(store);

    console.log(`[Server Store] Google Sheet disconnected for user ${userId}`);

    res.json({
      success: true,
      message: 'Google Sheet disconnected from user account.',
    });
  });

  // GET User's Cached Sheet Data Snapshot (Server-side cross-machine backup)
  app.get('/api/user/:userId/data-snapshot', (req, res) => {
    const { userId } = req.params;
    const store = loadStore();
    const snapshot = store.userSnapshots[userId] || null;

    res.json({
      success: true,
      snapshot,
    });
  });

  // POST User's Cached Sheet Data Snapshot
  app.post('/api/user/:userId/data-snapshot', (req, res) => {
    const { userId } = req.params;
    const { alumni, leads, scUsers, callLogs, followups, referenceResponses } = req.body || {};

    const store = loadStore();
    store.userSnapshots[userId] = {
      alumni: Array.isArray(alumni) ? alumni : [],
      leads: Array.isArray(leads) ? leads : [],
      scUsers: Array.isArray(scUsers) ? scUsers : [],
      callLogs: Array.isArray(callLogs) ? callLogs : [],
      followups: Array.isArray(followups) ? followups : [],
      referenceResponses: Array.isArray(referenceResponses) ? referenceResponses : [],
      updatedAt: new Date().toISOString(),
    };

    saveStore(store);

    res.json({
      success: true,
      message: 'Data snapshot persisted on server for user account.',
    });
  });

  // Vite middleware in dev, static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[SEAMEDU Server] Running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SEAMEDU Server] Fatal error starting server:', err);
  process.exit(1);
});
