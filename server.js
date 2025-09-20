require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const mysql = require("mysql2");

const app = express();

// Logging middleware
app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ MySQL connected as id", connection.threadId);
    connection.release();
  }
});

// Helpers
function getRandomInt(max) {
  return 1 + Math.floor(Math.random() * (max - 1));
}

async function getCharacter(id) {
  const [characters] = await pool
    .promise()
    .query("SELECT * FROM characters WHERE id = ?", [id]);
  return characters[0];
}

async function randomId() {
  const [rows] = await pool
    .promise()
    .query("SELECT COUNT(*) as total FROM characters");
  const { total } = rows[0];
  return getRandomInt(total);
}

// Routes
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "App is working 🚀",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

app.get("/db", async (req, res) => {
  try {
    const [rows] = await pool.promise().query("SELECT 1+1 AS result");
    res.json({
      status: "OK",
      message: "Database connected ✅",
      result: rows[0].result,
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed ❌",
      error: error.message,
    });
  }
});

app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.promise().query("SELECT 1 as dbCheck");
    res.send(`
      <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;flex-direction:column;">
        <h1>✅ Application Running</h1>
        <p>Express + MySQL App is running fine.</p>
        <p>MySQL status: ${
          rows[0].dbCheck === 1 ? "Connected ✅" : "Not Connected ❌"
        }</p>
        <p>
          <a href="/health">/health</a> | 
          <a href="/db">/db</a> | 
          <a href="/random">/random</a> | 
          <a href="/1">/1</a>
        </p>
      </div>
    `);
  } catch {
    res.send(`
      <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;flex-direction:column;">
        <h1>❌ App Running but DB not connected</h1>
      </div>
    `);
  }
});

app.get("/random", async (req, res) => {
  try {
    const id = await randomId();
    const character = await getCharacter(id);
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id) || (await randomId());
    const character = await getCharacter(id);
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
