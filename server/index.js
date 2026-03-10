import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";
import compression from "compression";
import connectDB from "./db/connection.js";
import { handleDemo } from "./routes/demo.js";
import productsRouter from "./routes/products.js";
import professionalsRouter from "./routes/professionals.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cart.js";
import favoritesRouter from "./routes/favorites.js";
import uploadsRouter from "./routes/uploads.js";
import storesRouter from "./routes/stores.js";
import categoriesRouter from "./routes/categories.js";
import ordersRouter from "./routes/orders.js";
import imagesRouter from "./routes/images.js";
import ownerRouter from "./routes/owner.js";
import managerRouter from "./routes/manager.js";
import professionalCategoriesRouter from "./routes/professionalCategories.js";
import carBrandsRouter from "./routes/carBrands.js";
import specialtiesRouter from "./routes/specialties.js";
import commentsRouter from "./routes/comments.js";
import imageSearchRouter from "./routes/imageSearch.js";

export function createServer() {
  const app = express();
  // Определяем корневую директорию проекта
  // В production: если запускается из dist/server/node-build.mjs, то rootDir должен быть на 2 уровня выше
  // В development: если запускается из server/index.js, то rootDir на 1 уровень выше
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Проверяем, находимся ли мы в dist/server (production) или в server (development)
  const isProduction = __dirname.includes("dist/server");
  const rootDir = isProduction 
    ? path.resolve(__dirname, "../..")  // dist/server -> ../.. -> корень проекта
    : path.resolve(__dirname, "../");   // server -> .. -> корень проекта
  
  // Альтернативно, можно использовать process.cwd() для определения корня проекта
  // const rootDir = process.env.PROJECT_ROOT || process.cwd();
  
  const uploadDir = process.env.UPLOAD_DIR 
    ? path.resolve(rootDir, process.env.UPLOAD_DIR) 
    : path.join(rootDir, "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Connect to MongoDB
  connectDB();

  // Middleware
  app.use(compression()); // Сжатие gzip для быстрой передачи
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  
  // Статические файлы с кэшированием
  const staticOptions = {
    maxAge: '7d', // Кэш на 7 дней
    etag: true,
    lastModified: true,
  };
  app.use("/api/uploads", express.static(uploadDir, staticOptions));
  // Backward compatibility for old /uploads paths
  app.use("/uploads", express.static(uploadDir, staticOptions));

  app.locals.uploadDir = uploadDir;

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "pong";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // API Routes
  app.use("/api/products", productsRouter);
  app.use("/api/professionals", professionalsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/favorites", favoritesRouter);
  app.use("/api/stores", storesRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api/manager", managerRouter);
  app.use("/api/professional-categories", professionalCategoriesRouter);
  app.use("/api/car-brands", carBrandsRouter);
  app.use("/api/specialties", specialtiesRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/image-search", imageSearchRouter);

  return app;
}
