#! /bin/node

import { program } from "commander";
import { table } from "table";
import { db } from "./connection.js";

const log = (...values) => console.log(...values);

const getColoredString = (string, color) => {
  const colors = {
    "red": 31,
    "green": 32
  }

  const colorAsNumber = colors[color]; 

  if (colorAsNumber === undefined) {
    throw new Error("Invalid color or not yet specified");
  } 

  return `\x1b[${colorAsNumber}m${string}\x1b[0m`;
};

const config = {
  columns: {
    0: { width: 10 },
    1: { width: 18 },
    2: { width: 34 }
  },
  border: {
      topBody: `-`,
      topJoin: `+`,
      topLeft: `+`,
      topRight: `+`,

      bottomBody: `-`,
      bottomJoin: `+`,
      bottomLeft: `+`,
      bottomRight: `+`,

      bodyLeft: `|`,
      bodyRight: `|`,
      bodyJoin: `|`,

      joinBody: `-`,
      joinLeft: `+`,
      joinRight: `+`,
      joinJoin: `+`
    }
  };

const handleListNotes = () => {
  const sql = `
    SELECT * FROM notes;
  `

  db.all(sql, (error, rows) => {
    if (error) {
      return log(error);
    }

    const tableHeaders = [getColoredString("id", "green"), getColoredString("title", "green"), getColoredString("content", "green")];
    const notesData = rows.map(row => Object.values(row));
    
    log(table([tableHeaders, ...notesData], config));
  });
};

const insertNoteInDatabase = (title, content) => {
  const sql = `
    INSERT INTO notes (title, content) VALUES (?, ?);
  `

  db.run(sql, [title, content], error => {
    if (error) {
      return log("Error when adding note");
    }

    log("Note has been added successfully");
  });
};

const verifyTitle = title => {
  if (title.trim().length > 100) {
    log("The title is too big (max. 100 characters)");
    return false;
  }

  return true;
}

const verifyContent = content => {
  const trimmedContent = content.trim();

  if (!trimmedContent.length) {
    log("The note must have content");
    return false;
  }

  if (trimmedContent.length > 255) {
    log("The content is too big (max. 255 characters)");
    return false;
  }

  return true;
};

const verifyId = id => {
  const idAsNumber = Number(id);

  if (idAsNumber <= 0) {
    log("Id must be greater than 0");
    return false;
  }

  if (!idAsNumber) {
    log("Id must be a number");
    return false;
  }

  return true;
};

const handleAddNote = (title, content) => {
  if (!verifyTitle(title)) return;
  if (!verifyContent(content)) return;

  insertNoteInDatabase(title.trim(), content.trim());
};

const deleteNoteInDatabase = id => {
  const sql = `
    DELETE FROM notes WHERE id = ?;
  `;

  db.run(sql, id, error => {
    if (error) {
      return log("Error when removing note");
    }

    log("Note has been successfully removed");
  });
};

const handleDeleteNote = id => {
  if (!verifyId(id)) return;

  deleteNoteInDatabase(Number(id));
};

const handleClearNotes = () => {
  const sql = `
    DELETE FROM notes;
  `

  db.run(sql, error => {
    if (error) {
      return log("Error when clearing all notes");
    }

    log("Notes has been successfully cleaned");
  })
};

const editNoteInDatabase = (title, content, id) => {
  const sql = `
    UPDATE notes SET title = ?, content = ? WHERE id = ?;
  `;

  db.run(sql, [title, content, id], error => {
    if (error) {
      return log("Error when editing the note");
    }

    log("Notes has been successfully edited");
  });
};

const handleEditNote = (id, title, content) => {
  if (!verifyTitle(title)) return;
  if (!verifyContent(content)) return; 
  if (!verifyId(id)) return;

  editNoteInDatabase(title.trim(), content.trim(), Number(id));
};

program
  .name("quick-notes")
  .version("1.0.0")
  .description("A notes app for productive people");

program.command("list")
  .alias("l")
  .description("list all your notes")
  .action(handleListNotes);

program.command("add")
  .alias("a")
  .description("add a note")
  .argument("[title]", "Title of the note you want to add")
  .argument("<content>", "Content of the note you want to add")
  .action(handleAddNote);

program.command("delete")
  .alias("d")
  .description("remove a note")
  .argument("<id>", "Id of the note you want to remove")
  .action(handleDeleteNote);

program.command("edit")
  .alias("e")
  .description("edit a note")
  .argument("<id>", "Id of the note you want to edit")
  .argument("[title]", "New title for the note you want to edit")
  .argument("<content>", "New content for the note you want to edit")
  .action(handleEditNote);

program.command("clear")
  .alias("c")
  .description("clear all notes")
  .action(handleClearNotes);

program.parse();

