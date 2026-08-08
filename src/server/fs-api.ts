import { Router } from 'express';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const fsApi = Router();

const DB_JSON_PATH = path.join(process.cwd(), 'db.json');

function getLocalDbData(): Record<string, any[]> {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read db.json fallback:", e);
  }
  return {};
}

function saveLocalDbData(data: Record<string, any[]>) {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Could not write db.json fallback:", e);
  }
}

// GET /api/fs/system/backup
fsApi.get('/system/backup', async (req, res) => {
  try {
    let backupObj: Record<string, any[]> = {};
    let totalDocuments = 0;

    try {
      const allDocs = await db.select().from(documents);
      for (const doc of allDocs) {
        if (!backupObj[doc.collectionName]) {
          backupObj[doc.collectionName] = [];
        }
        backupObj[doc.collectionName].push({
          id: doc.id,
          data: doc.data
        });
      }
      totalDocuments = allDocs.length;
    } catch {
      backupObj = getLocalDbData();
      totalDocuments = Object.values(backupObj).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
    }

    const backupPath = path.join(process.cwd(), 'backup_database_complete.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupObj, null, 2));
    res.json({
      success: true,
      totalDocuments,
      collectionsCount: Object.keys(backupObj).length,
      collections: Object.fromEntries(Object.entries(backupObj).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fs/:collection
fsApi.get('/:collection', async (req, res) => {
  const col = req.params.collection;
  try {
    const all = await db.select().from(documents).where(eq(documents.collectionName, col));
    const result = all.map(d => ({
      id: d.id,
      data: d.data
    }));
    return res.json(result);
  } catch (err) {
    // Fallback to local db.json
    const localData = getLocalDbData();
    const colList = localData[col] || [];
    const result = colList.map((item: any) => ({
      id: item.id,
      data: item.data || item
    }));
    return res.json(result);
  }
});

// GET /api/fs/:collection/:id
fsApi.get('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  try {
    const doc = await db.select().from(documents).where(and(
      eq(documents.collectionName, collection),
      eq(documents.id, id)
    ));
    if (doc.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ id: doc[0].id, data: doc[0].data });
  } catch (err) {
    // Fallback
    const localData = getLocalDbData();
    const colList = localData[collection] || [];
    const item = colList.find((i: any) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json({ id: item.id, data: item.data || item });
  }
});

// POST /api/fs/:collection (Add new document with generated ID)
fsApi.post('/:collection', async (req, res) => {
  const { collection } = req.params;
  const id = uuidv4();
  try {
    await db.insert(documents).values({
      collectionName: collection,
      id,
      data: req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (err) {
    // Fallback
    const localData = getLocalDbData();
    if (!localData[collection]) localData[collection] = [];
    localData[collection].push({ id, data: req.body });
    saveLocalDbData(localData);
  }
  return res.json({ id });
});

// PUT /api/fs/:collection/:id (Set document)
fsApi.put('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  try {
    const existing = await db.select().from(documents).where(and(
      eq(documents.collectionName, collection),
      eq(documents.id, id)
    ));

    if (existing.length === 0) {
      await db.insert(documents).values({
        collectionName: collection,
        id,
        data: req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      await db.update(documents)
        .set({ data: req.body, updatedAt: new Date() })
        .where(and(
          eq(documents.collectionName, collection),
          eq(documents.id, id)
        ));
    }
  } catch (err) {
    // Fallback
    const localData = getLocalDbData();
    if (!localData[collection]) localData[collection] = [];
    const idx = localData[collection].findIndex((i: any) => i.id === id);
    if (idx >= 0) {
      localData[collection][idx] = { id, data: req.body };
    } else {
      localData[collection].push({ id, data: req.body });
    }
    saveLocalDbData(localData);
  }
  return res.json({ success: true });
});

// PATCH /api/fs/:collection/:id (Update document partially)
fsApi.patch('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  try {
    const existing = await db.select().from(documents).where(and(
      eq(documents.collectionName, collection),
      eq(documents.id, id)
    ));

    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const updatedData = { ...(existing[0].data as any), ...req.body };

    await db.update(documents)
      .set({ data: updatedData, updatedAt: new Date() })
      .where(and(
        eq(documents.collectionName, collection),
        eq(documents.id, id)
      ));
  } catch (err) {
    // Fallback
    const localData = getLocalDbData();
    if (localData[collection]) {
      const idx = localData[collection].findIndex((i: any) => i.id === id);
      if (idx >= 0) {
        const current = localData[collection][idx].data || localData[collection][idx];
        localData[collection][idx] = { id, data: { ...current, ...req.body } };
        saveLocalDbData(localData);
      }
    }
  }
  return res.json({ success: true });
});

// DELETE /api/fs/:collection/:id
fsApi.delete('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  try {
    await db.delete(documents)
      .where(and(
        eq(documents.collectionName, collection),
        eq(documents.id, id)
      ));
  } catch (err) {
    // Fallback
    const localData = getLocalDbData();
    if (localData[collection]) {
      localData[collection] = localData[collection].filter((i: any) => i.id !== id);
      saveLocalDbData(localData);
    }
  }
  return res.json({ success: true });
});
