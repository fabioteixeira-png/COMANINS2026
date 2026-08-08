import { text, timestamp, pgTable, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  collectionName: text('collection_name').notNull(),
  id: text('id').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.collectionName, table.id] }),
  index('collection_idx').on(table.collectionName)
]);

