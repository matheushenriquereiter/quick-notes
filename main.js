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

const tableConfig = {
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

const verifyNote = (title, content) => {
  if (isStringLengthGreaterThan(title, 100)) {
    log("The title is too big (max. 100 characters)");
    return false;
  }
  
  if (isStringLengthGreaterThan(content, 255)) {
    log("The content is too big (max. 255 characters)");
    return false;
  }
  
  if (!content.length) {
    log("The note must have content");
    return false;
  }

  return true;
}

const handleListNotes = options => {
  if (options.limit) {
    if (!isNumber(options.limit)) {
      return log("Amount must be a number");
    }
  }

  const sql = options.limit 
    ? `SELECT * FROM notes LIMIT ${options.limit};`
    : "SELECT * FROM notes;";

  db.all(sql, (error, rows) => {
    if (error) {
      return log(getColoredString("Error when showing notes", "red"));
    }

    const tableHeaders = [getColoredString("id", "green"), getColoredString("title", "green"), getColoredString("content", "green")];
    const notesData = rows.map(row => Object.values(row));
    
    log(table([tableHeaders, ...notesData], tableConfig));
  });
};

const insertNoteInDatabase = (title, content) => {
  const sql = `
    INSERT INTO notes (title, content) VALUES (?, ?);
  `

  db.run(sql, [title, content], error => {
    if (error) {
      return log(getColoredString("Error when adding note", "red"));
    }

    log("Note has been added successfully");
  });
};

const handleAddNote = (title, content, options) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!verifyNote(trimmedTitle, trimmedContent)) return;

  insertNoteInDatabase(trimmedTitle, trimmedContent);
};

const deleteNoteInDatabase = id => {
  const sql = `
    DELETE FROM notes WHERE id = ?;
  `;

  db.run(sql, id, error => {
    if (error) {
      return log(getColoredString("Error when removing note", "red"));
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
      return log(getColoredString("Error when clearing all notes", "red"));
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
      return log(getColoredString("Error when editing the note", "red"));
    }

    log("Notes has been successfully edited");
  });
};

const handleEditNote = (id, title, content) => {
  const trimmedId = id.trim();
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!verifyNote(trimmedTitle, trimmedContent)) return;

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
  .option("-l, --limit <amount>", "Limit the number of notes shown")
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

