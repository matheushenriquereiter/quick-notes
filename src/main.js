#! /bin/node

import { program, Option } from "commander";
import { table } from "table";
import { tableConfig } from "./tableConfig.js";
import { db } from "./connection.js";
import chalk from "chalk";

const to = promise =>
  promise.then(data => [null, data]).catch(error => [error, null]);

const query = sql =>
  new Promise((resolve, reject) => {
    db.all(sql, (error, rows) => {
      if (error) {
        return reject(error);
      }

      resolve(rows);
    });
  });

const run = (sql, values) =>
  new Promise((resolve, reject) =>
    db.run(sql, values, (error, rows) => {
      if (error) {
        return reject(error);
      }

      resolve(rows);
    })
  );

const log = (...values) => console.log(...values);

const isNumber = value => {
  if (!String(value)) return false;

  return !isNaN(Number(value));
};

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

const getNotesTable = notes => {
  const prioritiesAsString = {
    1: chalk.green("low"),
    2: chalk.yellow("medium"),
    3: chalk.red("high"),
  };

  const tableHeaders = [
    chalk.green("id"),
    chalk.green("title"),
    chalk.green("content"),
    chalk.green("priority"),
  ];

  const notesAsArrays = notes.map(note => {
    const [id, title, content, priority] = Object.values(note);
    const priorityAsString = prioritiesAsString[priority];

    return [id, title, content, priorityAsString];
  });

  return table([tableHeaders, ...notesAsArrays], tableConfig);
};

const handleListNotes = async args => {
  if (args.hasOwnProperty("limit")) {
    if (!isNumber(args.limit)) {
      return log("Limit amount must be a number");
    }
  }

  const sql = args.limit
    ? `SELECT * FROM notes ORDER BY priority DESC LIMIT ${args.limit};`
    : "SELECT * FROM notes ORDER BY priority DESC;";

  const [error, notes] = await to(query(sql));

  if (error) {
    return log(error);
  }

  const notesTable = getNotesTable(notes);

  log(notesTable);
};

const insertNoteInDatabase = async (title, content, priority) => {
  const prioritiesAsNumber = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const priorityAsNumber = prioritiesAsNumber[priority];

  const sql = `
    INSERT INTO notes (title, content, priority) VALUES (?, ?, ?);
  `;

  const [error] = await to(run(sql, [title, content, priorityAsNumber]));

  if (error) {
    return log(error);
  }

  log("Note has been added successfully");
};

const handleAddNote = (title, content, { priority }) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!verifyNote(trimmedTitle, trimmedContent)) return;

  insertNoteInDatabase(trimmedTitle, trimmedContent, priority);
};

const deleteNoteInDatabase = async id => {
  const sql = `
    DELETE FROM notes WHERE id = ?;
  `;

  const [error] = await to(run(sql, [id]));

  if (error) {
    return log(error);
  }

  log("Note has been successfully removed");
};

const handleDeleteNote = id => {
  const trimmedId = id.trim();

  if (!isNumber(trimmedId)) {
    return log("Id must be a number");
  }

  deleteNoteInDatabase(Number(trimmedId));
};

const handleClearNotes = async () => {
  const sql = `
    DELETE FROM notes;
  `;

  const [error] = await to(run(sql));

  if (error) {
    return log(error);
  }

  log("Notes has been successfully cleaned");
};

const editNoteInDatabase = async (title, content, id) => {
  const sql = `
    UPDATE notes SET title = ?, content = ? WHERE id = ?;
  `;

  const [error] = await to(run(sql, [title, content, id]));

  if (error) {
    return log(error);
  }

  log("Notes has been successfully edited");
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

const handleSearchNotes = async (value, { first }) => {
  const sql = `
    SELECT * FROM notes;
  `;

  const [error, notes] = await to(query(sql));

  if (error) {
    return log(error);
  }

  const matchedNotes = notes.filter(({ id, title, content }) => {
    if (String(id).includes(value)) return true;

    if (title.includes(value)) return true;

    if (content.includes(value)) return true;

    return false;
  });

  const notesTable = getNotesTable(first ? [matchedNotes[0]] : matchedNotes);

  log(notesTable);
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
  .option("-f, --first", "Shows only the first note")
  .argument("<value>", "Value to look for in notes")
  .action(handleSearchNotes);

program.parse();
