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

  if (!colorAsNumber) {
    throw new Error("Invalid color or not yet specified");
  } 

  return `\x1b[${colorAsNumber}m${string}\x1b[0m`;
};

const isStringLengthGreaterThan = (string, lengthThreshold) => {
  return string.length > lengthThreshold
};

const isNumber = value => !isNaN(Number(value));

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
      return log("Error when showing notes");
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

const handleAddNote = (title, content) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (isStringLengthGreaterThan(trimmedTitle, 100)) {
    return log("The title is too big (max. 100 characters)");
  }
  
  if (isStringLengthGreaterThan(trimmedContent, 255)) {
    return log("The content is too big (max. 255 characters)");
  }
  
  if (!trimmedContent.length) {
    return log("The note must have content");
  }

  insertNoteInDatabase(trimmedTitle, trimmedContent);
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
  const trimmedId = id.trim();

  if (!isNumber(id)) {
    return log("Id must be a number");
  }

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
  const trimmedId = id.trim();
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (isStringLengthGreaterThan(trimmedTitle, 100)) {
    return log("The title is too big (max. 100 characters)");
  }
  
  if (isStringLengthGreaterThan(trimmedContent, 255)) {
    return log("The content is too big (max. 255 characters)");
  }

  if (!trimmedContent.length) {
    return log("The note must have content");
  }
 
  if (!isNumber(trimmedId)) {
    return log("Id must be a number");
  }

  editNoteInDatabase(trimmedTitle, trimmedContent, Number(id));
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

