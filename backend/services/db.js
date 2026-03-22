const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "ai-news.db");
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        return reject(err);
      }

      return resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }

      return resolve(row || null);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }

      return resolve(rows || []);
    });
  });
};

const initDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      persona TEXT,
      sectors TEXT,
      interests TEXT,
      portfolio_symbols TEXT,
      risk_appetite TEXT,
      horizon TEXT,
      updated_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      source_url TEXT,
      mode TEXT,
      content TEXT,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      article TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
};

const upsertProfile = async (profile) => {
  await run(
    `
      INSERT INTO profiles (
        user_id,
        persona,
        sectors,
        interests,
        portfolio_symbols,
        risk_appetite,
        horizon,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        persona=excluded.persona,
        sectors=excluded.sectors,
        interests=excluded.interests,
        portfolio_symbols=excluded.portfolio_symbols,
        risk_appetite=excluded.risk_appetite,
        horizon=excluded.horizon,
        updated_at=excluded.updated_at
    `,
    [
      profile.userId,
      profile.persona,
      JSON.stringify(profile.sectors || []),
      JSON.stringify(profile.interests || []),
      JSON.stringify(profile.portfolioSymbols || []),
      profile.riskAppetite,
      profile.horizon,
      profile.updatedAt
    ]
  );
};

const parseJsonArray = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const mapProfileRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    persona: row.persona || "",
    sectors: parseJsonArray(row.sectors),
    interests: parseJsonArray(row.interests),
    portfolioSymbols: parseJsonArray(row.portfolio_symbols),
    riskAppetite: row.risk_appetite || "medium",
    horizon: row.horizon || "long-term",
    updatedAt: row.updated_at || null
  };
};

const getProfileByUserId = async (userId) => {
  const row = await get("SELECT * FROM profiles WHERE user_id = ?", [userId]);
  return mapProfileRow(row);
};

const saveSummary = async ({ userId, sourceUrl, mode, content, response, createdAt }) => {
  await run(
    `
      INSERT INTO summaries (user_id, source_url, mode, content, response_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      sourceUrl || null,
      mode || null,
      content || "",
      JSON.stringify(response || {}),
      createdAt
    ]
  );
};

const parseJsonObject = (value) => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
};

const getSummaryHistoryByUserId = async (userId, limit = 20) => {
  const rows = await all(
    `
      SELECT id, user_id, source_url, mode, content, response_json, created_at
      FROM summaries
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    sourceUrl: row.source_url,
    mode: row.mode,
    content: row.content,
    response: parseJsonObject(row.response_json),
    createdAt: row.created_at
  }));
};

const saveChatInteraction = async ({ userId, article, question, answer, createdAt }) => {
  await run(
    `
      INSERT INTO chat_history (user_id, article, question, answer, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, article, question, answer, createdAt]
  );
};

const getChatHistoryByUserId = async (userId, limit = 20) => {
  const rows = await all(
    `
      SELECT id, user_id, article, question, answer, created_at
      FROM chat_history
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    article: row.article,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at
  }));
};

module.exports = {
  initDb,
  upsertProfile,
  getProfileByUserId,
  saveSummary,
  getSummaryHistoryByUserId,
  saveChatInteraction,
  getChatHistoryByUserId
};
