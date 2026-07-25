# 🚀 Rocket Colsubsidio — Sistema de Conteo Inteligente de Inventario

Sistema web para realizar conteos de inventario de forma práctica y organizada, orientado al control de consumos en la cocina del hotel Colsubsidio.

## 📱 Características

- **Autenticación por empleado**: Ingreso mediante código de empleado
- **Tres métodos de captura de productos**:
  - ⌨️ **Manual**: Ingreso de código por teclado
  - 🎙️ **Voz**: Speech-to-Text del navegador (español Colombia)
  - 📷 **Cámara**: Escáner de códigos de barras (QR, EAN-13, EAN-8, Code 128, Code 39)
- **Sesiones de conteo**: Por ubicación (cocina, bodega, almacén frío, etc.)
- **Auditoría vs ERP**: Comparación de conteos contra datos de Oracle Inventory
- **Análisis de consumo**: Top productos consumidos, tendencias, métodos de entrada

## 🏗️ Arquitectura

```
rocket-colsubsidio/
├── client/          # Frontend React + Vite + TypeScript + Tailwind CSS
│   └── src/
│       ├── pages/   # LoginPage, SessionsPage, CountPage, AuditPage
│       ├── components/  # VoiceInput, CameraInput
│       ├── utils/   # API client (axios)
│       └── types/   # TypeScript interfaces
├── server/          # Backend Express + TypeScript + SQLite
│   └── src/
│       ├── routes/  # employees, products, sessions, audit
│       ├── models/  # database (better-sqlite3)
│       └── seed.ts  # Demo data seeder
└── data/            # SQLite database (gitignored)
```

## 🚀 Instalación y Uso

### 1. Instalar dependencias

```bash
npm run install:all
```

### 2. Poblar base de datos con datos de prueba

```bash
npm run seed
```

Esto crea empleados demo y productos típicos de cocina de hotel, más datos de ERP simulados.

**Códigos de empleado para pruebas:**
- `EMP001` - Carlos Martínez
- `EMP002` - Ana García
- `EMP003` - Pedro López
- `EMP004` - María Rodríguez
- `ADMIN`  - Administrador

### 3. Iniciar servidores

En dos terminales separados:

```bash
# Terminal 1: Backend (puerto 3001)
npm run dev:server

# Terminal 2: Frontend (puerto 5173)
npm run dev:client
```

Abrir en el navegador: http://localhost:5173

### 4. Producción

```bash
npm run build
npm start
```

## 📡 API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/employees/login` | Autenticar empleado |
| GET | `/api/employees` | Listar empleados |
| GET | `/api/products` | Listar/buscar productos |
| GET | `/api/products/:code` | Buscar producto por código |
| POST | `/api/sessions` | Crear sesión de conteo |
| GET | `/api/sessions` | Listar sesiones |
| GET | `/api/sessions/:id` | Ver sesión con items |
| POST | `/api/sessions/:id/items` | Agregar producto al conteo |
| DELETE | `/api/sessions/:id/items/:itemId` | Eliminar item |
| PUT | `/api/sessions/:id/close` | Cerrar sesión |
| GET | `/api/audit?date=YYYY-MM-DD` | Auditoría vs ERP |
| POST | `/api/audit/erp` | Importar datos ERP |
| GET | `/api/audit/analytics` | Análisis de consumo |

## 🔗 Integración con Oracle Inventory

Para importar datos del ERP, use el endpoint `POST /api/audit/erp`:

```json
{
  "report_date": "2024-01-15",
  "items": [
    {
      "product_code": "ARROZ001",
      "product_name": "Arroz Blanco 25kg",
      "expected_quantity": 45.5,
      "unit": "KG"
    }
  ]
}
```

## 📊 Base de Datos

SQLite con las siguientes tablas:
- `employees` — Empleados del hotel
- `products` — Catálogo de productos de cocina
- `count_sessions` — Sesiones de conteo
- `count_items` — Items contados por sesión
- `erp_data` — Datos importados de Oracle Inventory

## 🌐 Compatibilidad

- **Tablet/Móvil**: Diseño optimizado para pantallas táctiles
- **Voz**: Chrome en Android / Chrome Desktop (requiere micrófono)
- **Cámara**: Navegadores modernos con soporte `getUserMedia`
- **Códigos soportados**: QR, EAN-13, EAN-8, UPC-A, Code 128, Code 39
