import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Kullanıcı Tablosu
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// Nota / Eser Arşivi Tablosu
export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  composer: text("composer"),
  makam: text("makam").notNull(),
  usul: text("usul").notNull(),
  form: text("form"),
  // SymbTr formatı (veya benzeri bir JSON yapısı) ile notalar (SQLite json desteği text tabanlıdır)
  notesData: text("notes_data", { mode: "json" }).notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
