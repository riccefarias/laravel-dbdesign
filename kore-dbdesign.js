#!/usr/bin/env node


const express = require('express');
const migrationRoutes = require('./routes/migrations');

const path = require('path');

const app = express();
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.use('/api/migrations', migrationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
