import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('ertansa_audit.db');
    await initDB(db);
  }
  return db;
}

async function initDB(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_inspections (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      inspector_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      latitude REAL,
      longitude REAL,
      location_verified INTEGER DEFAULT 0,
      started_at TEXT,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pending_responses (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      checklist_item_id TEXT NOT NULL,
      score INTEGER,
      passed INTEGER,
      text_response TEXT,
      notes TEXT,
      severity TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pending_photos (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      response_id TEXT,
      local_uri TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      caption TEXT,
      uploaded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_templates (
      id TEXT PRIMARY KEY,
      facility_type TEXT NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      facility_type TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export async function savePendingInspection(inspection: {
  id: string;
  branch_id: string;
  template_id: string;
  inspector_id: string;
  latitude?: number;
  longitude?: number;
  location_verified?: boolean;
}) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_inspections (id, branch_id, template_id, inspector_id, latitude, longitude, location_verified, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [inspection.id, inspection.branch_id, inspection.template_id, inspection.inspector_id, inspection.latitude ?? null, inspection.longitude ?? null, inspection.location_verified ? 1 : 0]
  );
}

export async function getPendingInspections() {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM pending_inspections ORDER BY created_at DESC');
}

export async function savePendingResponse(response: {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  score?: number;
  passed?: boolean;
  text_response?: string;
  notes?: string;
  severity?: string;
}) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_responses (id, inspection_id, checklist_item_id, score, passed, text_response, notes, severity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [response.id, response.inspection_id, response.checklist_item_id, response.score ?? null, response.passed !== undefined ? (response.passed ? 1 : 0) : null, response.text_response ?? null, response.notes ?? null, response.severity ?? null]
  );
}

export async function savePendingPhoto(photo: {
  id: string;
  inspection_id: string;
  response_id?: string;
  local_uri: string;
  latitude?: number;
  longitude?: number;
  caption?: string;
}) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_photos (id, inspection_id, response_id, local_uri, latitude, longitude, caption)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [photo.id, photo.inspection_id, photo.response_id ?? null, photo.local_uri, photo.latitude ?? null, photo.longitude ?? null, photo.caption ?? null]
  );
}

export async function getPendingPhotos(inspectionId?: string) {
  const database = await getDB();
  if (inspectionId) {
    return database.getAllAsync('SELECT * FROM pending_photos WHERE inspection_id = ? AND uploaded = 0', [inspectionId]);
  }
  return database.getAllAsync('SELECT * FROM pending_photos WHERE uploaded = 0');
}

export async function markPhotoUploaded(photoId: string) {
  const database = await getDB();
  await database.runAsync('UPDATE pending_photos SET uploaded = 1 WHERE id = ?', [photoId]);
}

export async function deletePendingInspection(id: string) {
  const database = await getDB();
  await database.runAsync('DELETE FROM pending_responses WHERE inspection_id = ?', [id]);
  await database.runAsync('DELETE FROM pending_photos WHERE inspection_id = ?', [id]);
  await database.runAsync('DELETE FROM pending_inspections WHERE id = ?', [id]);
}

export async function cacheTemplates(templates: Array<{ id: string; facility_type: string; name: string; data: any }>) {
  const database = await getDB();
  for (const t of templates) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cached_templates (id, facility_type, name, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [t.id, t.facility_type, t.name, JSON.stringify(t.data)]
    );
  }
}

export async function getCachedTemplates(facilityType?: string) {
  const database = await getDB();
  if (facilityType) {
    return database.getAllAsync('SELECT * FROM cached_templates WHERE facility_type = ?', [facilityType]);
  }
  return database.getAllAsync('SELECT * FROM cached_templates');
}

export async function cacheBranches(branches: Array<{ id: string; name: string; facility_type: string; data: any }>) {
  const database = await getDB();
  for (const b of branches) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cached_branches (id, name, facility_type, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [b.id, b.name, b.facility_type, JSON.stringify(b.data)]
    );
  }
}

export async function getCachedBranches(facilityType?: string) {
  const database = await getDB();
  if (facilityType) {
    return database.getAllAsync('SELECT * FROM cached_branches WHERE facility_type = ?', [facilityType]);
  }
  return database.getAllAsync('SELECT * FROM cached_branches');
}
