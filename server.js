// 1️⃣ Importar librerías
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import twilio from "twilio";
import dotenv from "dotenv";
import multer from "multer"; // 📸 Para subir imágenes

dotenv.config(); // Cargar variables del .env

// 2️⃣ Configuración de rutas y servidor
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 3️⃣ Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // ✅ ruta simplificada para Render

// 3️⃣b Configurar sesión
app.use(
  session({
    secret: "mi_clave_secreta123",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 hora
  })
);

// 4️⃣ Conexión a SQLite
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error al abrir la base de datos:", err.message);
  else console.log("✅ Conexión a SQLite correcta");
});

// Crear tabla preinscripciones
db.run(`
  CREATE TABLE IF NOT EXISTS preinscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres TEXT,
    apellidos TEXT,
    ci TEXT,
    fecha_nac TEXT,
    genero TEXT,
    grado TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    procedencia TEXT,
    t_nombre TEXT,
    t_cel TEXT,
    t_parentezco TEXT,
    t_email TEXT,
    emergencia TEXT,
    estado TEXT DEFAULT 'pendiente'
  )
`);

// ✅ Nueva tabla pagos
db.run(`
  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    correo TEXT,
    monto REAL,
    fecha TEXT,
    comprobante TEXT
  )
`);

// 📸 Configurar almacenamiento de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/comprobantes"); // carpeta donde se guardan los comprobantes
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // nombre único del archivo
  },
});
const upload = multer({ storage });

// 5️⃣ Admin
const ADMIN_USER = "admin";
const ADMIN_PASS = "12345";

// 6️⃣ Rutas HTML
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/preinscripcion", (req, res) => res.sendFile(path.join(__dirname, "views", "preinscripcion.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/docentes", (req, res) => res.sendFile(path.join(__dirname, "views", "docentes.html")));
app.get("/acerca", (req, res) => res.sendFile(path.join(__dirname, "views", "acerca.html")));
app.get("/ubicacion", (req, res) => res.sendFile(path.join(__dirname, "views", "ubicacion.html")));
app.get("/pago", (req, res) => res.sendFile(path.join(__dirname, "views", "pago.html"))); // Nueva página de pagos

// 7️⃣ Middleware de autenticación
function authAdmin(req, res, next) {
  if (req.session && req.session.user === ADMIN_USER) next();
  else res.redirect("/login");
}

app.get("/admin", authAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

// 8️⃣ Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = username;
    res.json({ message: "Login correcto" });
  } else {
    res.status(401).json({ message: "Usuario o contraseña incorrectos" });
  }
});

// 9️⃣ Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Sesión cerrada" });
});

// 🔟 Recibir formulario de preinscripción
app.post("/api/preinscripcion", (req, res) => {
  const data = req.body;
  const sql = `
    INSERT INTO preinscripciones
    (nombres, apellidos, ci, fecha_nac, genero, grado, direccion, telefono, email, procedencia, t_nombre, t_cel, t_parentezco, t_email, emergencia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    sql,
    [
      data.nombres,
      data.apellidos,
      data.ci,
      data.fecha_nac,
      data.genero,
      data.grado,
      data.direccion,
      data.telefono,
      data.email,
      data.procedencia,
      data.t_nombre,
      data.t_cel,
      data.t_parentezco,
      data.t_email,
      data.emergencia,
    ],
    function (err) {
      if (err) res.status(500).json({ message: "Error al guardar la preinscripción" });
      else res.json({ message: "Preinscripción enviada correctamente" });
    }
  );
});

// 1️⃣1️⃣ Mostrar registros (solo admin)
app.get("/api/preinscripciones", authAdmin, (req, res) => {
  db.all("SELECT * FROM preinscripciones ORDER BY id DESC", [], (err, rows) => {
    if (err) res.status(500).json({ message: "Error al obtener registros" });
    else res.json(rows);
  });
});

// ✅ 1️⃣2️⃣ Registrar pago con imagen del comprobante
app.post("/api/registrar_pago", upload.single("comprobante"), (req, res) => {
  const { nombre, correo, monto, fecha } = req.body;
  const comprobante = req.file ? `/uploads/comprobantes/${req.file.filename}` : null;

  const sql = `
    INSERT INTO pagos (nombre, correo, monto, fecha, comprobante)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [nombre, correo, monto, fecha, comprobante], function (err) {
    if (err) res.status(500).json({ message: "Error al registrar el pago" });
    else res.json({ message: "Pago registrado correctamente ✅" });
  });
});

// ✅ 1️⃣3️⃣ Mostrar lista de pagos (solo admin)
app.get("/api/pagos", authAdmin, (req, res) => {
  db.all("SELECT * FROM pagos ORDER BY id DESC", [], (err, rows) => {
    if (err) res.status(500).json({ message: "Error al obtener pagos" });
    else res.json(rows);
  });
});

// 1️⃣4️⃣ TWILIO CONFIG (desde .env)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP;
const client = twilio(accountSid, authToken);

// Función para enviar WhatsApp
async function enviarWhatsApp(numeroDestino, mensaje) {
  try {
    const response = await client.messages.create({
      body: mensaje,
      from: whatsappNumber,
      to: `whatsapp:${numeroDestino}`,
    });
    console.log("✅ WhatsApp enviado:", response.sid);
    return response;
  } catch (error) {
    console.error("❌ Error enviando WhatsApp:", error.message);
    throw error;
  }
}

// 1️⃣5️⃣ Aceptar estudiante
app.post("/api/aceptar_estudiante", authAdmin, (req, res) => {
  const { id } = req.body;
  db.get("SELECT telefono FROM preinscripciones WHERE id=?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: "Estudiante no encontrado" });

    const numero = row.telefono.startsWith("+") ? row.telefono : `+591${row.telefono}`;

    db.run("UPDATE preinscripciones SET estado='aceptado' WHERE id=?", [id], async function (err) {
      if (err) return res.status(500).json({ message: err.message });

      const mensaje =
        "✅ Tu formulario fue aprobado. ¡Bienvenido! puedes pagar en linea mediante la pag https://pag-triana.onrender.com , escoges pago en linea.";
      try {
        await enviarWhatsApp(numero, mensaje);
        res.json({ message: "Estudiante aceptado y mensaje enviado" });
      } catch {
        res.status(500).json({ message: "Error enviando mensaje" });
      }
    });
  });
});

// 1️⃣6️⃣ Rechazar estudiante
app.post("/api/rechazar_estudiante", authAdmin, (req, res) => {
  const { id } = req.body;
  db.get("SELECT telefono FROM preinscripciones WHERE id=?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: "Estudiante no encontrado" });

    const numero = row.telefono.startsWith("+") ? row.telefono : `+591${row.telefono}`;

    db.run("UPDATE preinscripciones SET estado='rechazado' WHERE id=?", [id], async function (err) {
      if (err) return res.status(500).json({ message: err.message });

      const mensaje =
        "❌ Tu formulario fue rechazado. Para más información, contacta a la institución.";
      try {
        await enviarWhatsApp(numero, mensaje);
        res.json({ message: "Estudiante rechazado y mensaje enviado" });
      } catch {
        res.status(500).json({ message: "Error enviando mensaje" });
      }
    });
  });
});

// 1️⃣7️⃣ Borrar estudiante
app.post("/api/borrar_estudiante", authAdmin, (req, res) => {
  const { id } = req.body;
  db.run("DELETE FROM preinscripciones WHERE id=?", [id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Estudiante eliminado" });
  });
});

// 1️⃣8️⃣ Iniciar servidor
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
