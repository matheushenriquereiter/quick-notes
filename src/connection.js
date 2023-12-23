import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathname = path.join(__dirname, "..", "app.db");

const createNotesTable = async db => {
  const sql = `
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT, content TEXT NOT NULL, priority INTEGER NOT NULL);
  `;

  await db.exec(sql);
};

const createDatabaseConnection = async () => {
  const db = await open({
    filename: pathname,
    driver: sqlite3.Database,
  });

  await createNotesTable(db);

  return db;
};

export const db = await createDatabaseConnection();
