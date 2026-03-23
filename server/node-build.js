import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index.js";
import express from "express";
import fs from "fs";

// Получаем абсолютный путь к текущему файлу
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем корневую директорию проекта (на уровень выше server)
const rootDir = path.resolve(__dirname, "..");
const distPath = path.resolve(rootDir, "dist/spa");
const indexHtmlPath = path.resolve(distPath, "index.html");

// Проверяем существование директории и файла
if (!fs.existsSync(distPath)) {
  console.error(`❌ Ошибка: Директория ${distPath} не найдена!`);
  console.error("💡 Убедитесь, что фронтенд собран командой: npm run build:client");
  process.exit(1);
}

if (!fs.existsSync(indexHtmlPath)) {
  console.error(`❌ Ошибка: Файл ${indexHtmlPath} не найден!`);
  console.error("💡 Убедитесь, что фронтенд собран командой: npm run build:client");
  process.exit(1);
}

const app = createServer();
const port = process.env.PORT || 3000;

// Логируем пути для отладки
console.log(`📁 Корневая директория: ${rootDir}`);
console.log(`📁 Путь к фронтенду: ${distPath}`);
console.log(`📄 index.html: ${indexHtmlPath}`);

// Serve static files from dist/spa
app.use(express.static(distPath, {
  maxAge: "1d", // Кэширование статических файлов на 1 день
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Handle React Router - serve index.html for all non-API routes
// Используем middleware вместо app.get("*") для совместимости с Express 5
// Важно: этот middleware должен быть последним, после всех API маршрутов и статики
app.use((req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  // Не отдаем index.html для статических файлов (они уже обработаны express.static)
  // Проверяем, не является ли запрос статическим файлом
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|map)$/)) {
    return res.status(404).json({ error: "Static file not found" });
  }

  // Проверяем существование файла перед отправкой
  if (!fs.existsSync(indexHtmlPath)) {
    return res.status(500).json({ error: "Frontend not found" });
  }

  // Отдаем index.html для всех остальных маршрутов (SPA)
  res.sendFile(indexHtmlPath);
});

app.listen(port, () => {
  console.log(`🚀 AvtoFix server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`💚 Health: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
