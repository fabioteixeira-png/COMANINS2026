import { Router } from 'express';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const fsApi = Router();

// GET /api/fs/system/backup
fsApi.get('/system/backup', async (req, res) => {
  try {
    const allDocs = await db.select().from(documents);
    const backupObj: Record<string, any[]> = {};
    for (const doc of allDocs) {
      if (!backupObj[doc.collectionName]) {
        backupObj[doc.collectionName] = [];
      }
      backupObj[doc.collectionName].push({
        id: doc.id,
        data: doc.data
      });
    }
    const backupPath = path.join(process.cwd(), 'backup_database_complete.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupObj, null, 2));
    res.json({
      success: true,
      totalDocuments: allDocs.length,
      collectionsCount: Object.keys(backupObj).length,
      collections: Object.fromEntries(Object.entries(backupObj).map(([k, v]) => [k, v.length]))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fs/:collection
fsApi.get('/:collection', async (req, res) => {
  try {
    const col = req.params.collection;
    const all = await db.select().from(documents).where(eq(documents.collectionName, col));
    const result = all.map(d => ({
      id: d.id,
      data: d.data
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fs/:collection/:id
fsApi.get('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const doc = await db.select().from(documents).where(and(
      eq(documents.collectionName, collection),
      eq(documents.id, id)
    ));
    if (doc.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc[0].id, data: doc[0].data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fs/:collection (Add new document with generated ID)
fsApi.post('/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const id = uuidv4();
    await db.insert(documents).values({
      collectionName: collection,
      id,
      data: req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fs/:collection/:id (Set document)
fsApi.put('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    
    // Upsert
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
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/fs/:collection/:id (Update document partially)
fsApi.patch('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    
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
      
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fs/:collection/:id
fsApi.delete('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    await db.delete(documents)
      .where(and(
        eq(documents.collectionName, collection),
        eq(documents.id, id)
      ));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
