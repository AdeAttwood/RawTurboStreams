import bodyParser from "body-parser";
import express from "express";
import { Liquid } from "liquidjs";
import path from "node:path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// ESM Polyfill to use commonjs __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up the application
const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Set up the liquid template engine
const engine = new Liquid({
  extname: ".html.liquid",
  outputEscape: "escape",
  root: [
    path.resolve(__dirname, "views/"),
    path.resolve(__dirname, "views/partials/"),
  ],
});

// In memory database
const DB = {
  tasks: [{ id: uuidv4(), title: "Task one" }],
};

// The index route will render the index.liquid.html file and pass in the tasks
// and render the full page.
app.get("/", (req, res) => {
  res.send(engine.renderFileSync("index", { tasks: DB.tasks }));
});

// The create-task route will add a new task to the database and return a turbo stream to update the ui
app.post("/create-task", (req, res) => {
  const task = { id: uuidv4(), title: req.body.task.title };
  DB.tasks.push(task);

  // Set the content type to a turbo stream so the library knows what todo with
  // the response.
  res.contentType("text/vnd.turbo-stream.html; charset=utf-8");

  // Append the new task to teh task list and also update the task form to
  // reset the inputs, also remove any error messages if we were doing
  // validation :). You can return multiple streams in one response to update
  // multiple parts of the page.
  res.send(`
    <turbo-stream action="append" target="task-list">
      <template>
        ${engine.renderFileSync("partials/task-item", { task })}
      </template>
    </turbo-stream>
    <turbo-stream action="update" target="task-form">
      <template>
        ${engine.renderFileSync("partials/task-form")}
      </template>
    </turbo-stream>
  `);
});

app.post("/task-delete", (req, res) => {
  // The task id is for some reason in the body of the request, even though its
  // a query param in the url.
  DB.tasks = DB.tasks.filter((task) => task.id !== req.body.id);

  // Set the content type to a turbo stream so the library knows what todo with
  // the response.
  res.contentType("text/vnd.turbo-stream.html; charset=utf-8");

  // Update the task list with the new list of tasks. This time we are
  // replacing the hole list and only returning one stream.
  res.send(`
    <turbo-stream action="replace" target="task-list">
      <template>
        ${engine.renderFileSync("partials/task-list", { tasks: DB.tasks })}
      </template>
    </turbo-stream>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
