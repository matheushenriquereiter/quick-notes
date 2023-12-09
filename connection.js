import sqlite3 from "sqlite3";
const pathname = "./app.db";

const createNotesTable = db => {
  const sql = `
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT, content TEXT NOT NULL);
  `

  db.exec(sql);
};

const createDatabaseConnection = () => {
  const db = new sqlite3.Database(pathname, error => {
    if (error) return console.log(error);
  });
  
  createNotesTable(db);
  return db;
};

export const db = createDatabaseConnection();

