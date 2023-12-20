#! /bin/node

import { program, Option } from "commander";
import { table } from "table";
import { tableConfig } from "./tableConfig.js";
import { db } from "./connection.js";
import chalk from "chalk";

const log = (...values) => console.log(...values);

const isNumber = value => !isNaN(Number(value));

const prioritiesAsString = {
  1: chalk.green("low"),
  2: chalk.yellow("medium"),
  3: chalk.red("high"),
};

const prioritiesAsNumber = {
  low: 1,
  medium: 2,
  high: 3,
};

const tableHeaders = [
  chalk.green("id"),
  chalk.green("title"),
  chalk.green("content"),
  chalk.green("priority"),
];

const verifyNote = (title, content) => {
  if (title > 100) {
    log("The title is too big (max. 100 characters)");
    return false;
  }

  if (content > 255) {
    log("The content is too big (max. 255 characters)");
    return false;
  }

  if (!content.length) {
    log("The note must have content");
    return false;
  }

  return true;
};

const showNotesInTable = notes => {
  const notesAsArrays = notes.map(note => {
    const [id, title, content, priority] = Object.values(note);

    return [id, title, content, prioritiesAsString[priority]];
  });

  log(table([tableHeaders, ...notesAsArrays], tableConfig));
};

const handleListNotes = ({ limit }) => {
  if (limit) {
    if (!isNumber(limit)) {
      return log("Amount must be a number");
    }
  }

  const sql = limit
    ? `SELECT * FROM notes ORDER BY priority DESC LIMIT ${limit};`
    : "SELECT * FROM notes ORDER BY priority DESC;";

  db.all(sql, (error, rows) => {
    if (error) {
      return log(error);
    }

    showNotesInTable(rows);
  });
};

const insertNoteInDatabase = (title, content, priority) => {
  const sql = `
    INSERT INTO notes (title, content, priority) VALUES (?, ?, ?);
  `;

  db.run(sql, [title, content, prioritiesAsNumber[priority]], error => {
    if (error) {
      return log(error);
    }

    log("Note has been added successfully");
  });
};

const handleAddNote = (title, content, { priority }) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!verifyNote(trimmedTitle, trimmedContent)) return;

  insertNoteInDatabase(trimmedTitle, trimmedContent, priority);
};

const deleteNoteInDatabase = id => {
  const sql = `
    DELETE FROM notes WHERE id = ?;
  `;

  db.run(sql, id, error => {
    if (error) {
      return log(error);
    }

    log("Note has been successfully removed");
  });
};

const handleDeleteNote = id => {
  const trimmedId = id.trim();

  if (!isNumber(trimmedId)) {
    return log("Id must be a number");
  }

  deleteNoteInDatabase(Number(trimmedId));
};

const handleClearNotes = () => {
  const sql = `
    DELETE FROM notes;
  `;

  db.run(sql, error => {
    if (error) {
      return log(error);
    }

    log("Notes has been successfully cleaned");
  });
};

const editNoteInDatabase = (title, content, id) => {
  const sql = `
    UPDATE notes SET title = ?, content = ? WHERE id = ?;
  `;

  db.run(sql, [title, content, id], error => {
    if (error) {
      return log(error);
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

const handleSearchNotes = value => {
  const sql = `
    SELECT * FROM notes;
  `;

  db.all(sql, (error, rows) => {
    if (error) {
      return console.log(error);
    }

    const matchedNotes = rows.filter(
      ({ id, title, content }) =>
        String(id).includes(value) ||
        title.includes(value) ||
        content.includes(value)
    );

    showNotesInTable(matchedNotes);
  });
};

program
  .name("quick-notes")
  .version("1.0.0")
  .description("A notes app for productive people");

program
  .command("list")
  .alias("l")
  .description("List all your notes")
  .option("-l, --limit <amount>", "Limit the number of notes shown")
  .action(handleListNotes);

program
  .command("add")
  .alias("a")
  .addOption(
    new Option(
      "-p, --priority <priority>",
      "Set the priority level of your note"
    )
      .choices(["low", "medium", "high"])
      .default("medium")
  )
  .description("Add a note")
  .argument("[title]", "Title of the note you want to add")
  .argument("<content>", "Content of the note you want to add")
  .action(handleAddNote);

program
  .command("delete")
  .alias("d")
  .description("Remove a note")
  .argument("<id>", "Id of the note you want to remove")
  .action(handleDeleteNote);

program
  .command("edit")
  .alias("e")
  .description("Edit a note")
  .argument("<id>", "Id of the note you want to edit")
  .argument("[title]", "New title for the note you want to edit")
  .argument("<content>", "New content for the note you want to edit")
  .action(handleEditNote);

program
  .command("clear")
  .alias("c")
  .description("Clear all notes")
  .action(handleClearNotes);

program
  .command("search")
  .alias("s")
  .description("Search for notes")
  .argument("<value>", "Value to look for in notes")
  .action(handleSearchNotes);

program.parse();
