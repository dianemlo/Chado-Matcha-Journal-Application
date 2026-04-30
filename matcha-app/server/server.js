// // // server/server.js
// // console.log("ENV TEST:", process.env.MONGO_URI);
// // // require("dotenv").config();
// // console.log("AFTER DOTENV:", process.env.MONGO_URI);
// // const express = require("express");
// // const mongoose = require("mongoose");
// // const cors = require("cors");
// // // require("dotenv").config();
// // require("dotenv").config({ path: "../.env" });

// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// // mongoose.connect(process.env.MONGO_URI)
// //   .then(() => console.log("Connected to MongoDB"))
// //   .catch(err => console.log(err));

// // app.use("/auth", require("./routes/auth"));
// // app.use("/matcha", require("./routes/matcha"));

// // app.listen(5000, () => console.log("Server running"));

// // server/server.js
// require("dotenv").config({ path: "../.env" });

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch(err => console.log(err));

// app.use("/auth", require("./routes/auth"));
// app.use("/matcha", require("./routes/matcha"));

// app.listen(5000, () => console.log("Server running"));

// server/server.js
require('dotenv').config({ path: '../.env' });

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend from the client/ folder
app.use(express.static(path.join(__dirname, '../client')));

// ── Database ──────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB:', process.env.MONGO_URI))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ── API Routes ────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/matcha', require('./routes/matcha'));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

// ── Start ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));