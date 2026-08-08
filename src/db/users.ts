import { db } from './index.ts';
import { documents } from './schema.ts';
import { eq, and } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const existing = await db.select().from(documents).where(and(
      eq(documents.collectionName, 'users'),
      eq(documents.id, uid)
    ));
    
    if (existing.length > 0) {
      return { uid, email, id: uid };
    }
    
    await db.insert(documents).values({
      collectionName: 'users',
      id: uid,
      data: { uid, email },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return { uid, email, id: uid };
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
