# ⚡ Conquista Relámpago — Tecnologías y Funciones

> Juego de trivia interfacultades en tiempo real desarrollado para **UNIPAZ**.

---

## 🗂️ Estructura del Proyecto

```
conquista-relampago/
├── server/          → Backend (servidor Node.js)
│   ├── server.js    → Lógica del juego y WebSockets
│   └── preguntas.json → Banco de preguntas persistente
└── client/          → Frontend (aplicación React)
    ├── src/pages/   → Pantallas de la aplicación
    ├── public/assets/ → Imágenes y recursos estáticos
    └── dist/        → Build compilado (lo que ve el navegador)
```

---

## 🛠️ Tecnologías Utilizadas

### Backend

| Tecnología | Versión | Función |
|---|---|---|
| **Node.js** | v18+ | Entorno de ejecución del servidor |
| **Express.js** | v4 | Servidor HTTP — sirve la app web al navegador |
| **Socket.io** | v4 | Comunicación en tiempo real entre admin, jugadores y auditorio |
| **fs (Node built-in)** | — | Lectura y escritura de `preguntas.json` para persistencia |

### Frontend

| Tecnología | Versión | Función |
|---|---|---|
| **React** | v18 | Librería para construir las interfaces de usuario |
| **TypeScript** | v5 | JavaScript con tipos — evita errores en el código |
| **Vite** | v8 | Empaquetador y compilador del proyecto React |
| **Tailwind CSS** | v3 | Framework de estilos para diseñar la UI rápidamente |
| **Lucide React** | — | Librería de íconos SVG (trofeo, reloj, usuarios, etc.) |
| **Socket.io-client** | v4 | Conexión del navegador con el servidor en tiempo real |

### Infraestructura y Despliegue

| Servicio | Función |
|---|---|
| **GitHub** | Control de versiones y almacenamiento del código fuente |
| **Render.com** | Hosting del servidor Node.js en la nube (URL pública) |
| **api.qrserver.com** | API externa que genera el código QR dinámicamente |

---

## 📱 Pantallas de la Aplicación

### 1. Panel del Auditorio — `/` (pantalla principal)
**Archivo:** `client/src/pages/AuditorioApp.tsx`

Es la pantalla que se proyecta en el televisor o pantalla del salón.

- Muestra el **mapa circular** de 5 sectores territoriales en tiempo real
- Muestra el **logo de UNIPAZ** y el nombre del evento
- Genera y muestra el **código QR** y el **PIN** para que los estudiantes se unan
- Muestra la **tabla de posiciones** ordenada por sectores conquistados y puntos
- Muestra el **historial de actividad** (eventos de la partida)
- Se actualiza automáticamente con cada respuesta sin recargar la página

---

### 2. Panel del Administrador/Expositor — `/admin.html`
**Archivo:** `client/src/pages/AdminApp.tsx`

Es la pantalla que controla el expositor o docente durante la clase.

- **Crear partida:** genera un PIN único de 4 dígitos para la sesión
- **Configurar carreras:** lista las 5 carreras participantes (Medicina, Ingeniería, Ciencias, Arte, Derecho) — precargadas por defecto
- **Banco de preguntas:** muestra todas las preguntas guardadas en el servidor
- **Lanzar pregunta:** selecciona una pregunta y el sector del mapa que se disputa
- **Cerrar ronda:** termina el tiempo de una pregunta y calcula el ganador del sector
- **Iniciar / Finalizar juego:** controla el flujo completo de la partida

---

### 3. Panel del Jugador — `/jugar.html`
**Archivo:** `client/src/pages/JugarApp.tsx`

Es la pantalla que abre cada estudiante en su celular.

- El estudiante ingresa el **PIN** de la partida y elige su **carrera**
- Cuando el admin lanza una pregunta, aparece en pantalla con contador regresivo
- El estudiante selecciona su respuesta (A, B, C o D)
- Recibe retroalimentación inmediata si fue correcta o incorrecta
- Muestra la tabla de posiciones en tiempo real

---

## ⚙️ Cómo Funciona el Sistema en Tiempo Real

```
[Admin lanza pregunta]
        ↓
[Servidor recibe el evento via Socket.io]
        ↓
[Servidor retransmite a TODOS los clientes]
        ↓         ↓              ↓
   [Auditorio] [Jugadores]   [Admin]
   (muestra    (pueden        (ve el
   pregunta)   responder)     marcador)
```

Cada vez que un estudiante responde:
1. El servidor valida si la respuesta es correcta
2. Suma el punto a la carrera correspondiente
3. Emite los marcadores actualizados a auditorio y admin **en tiempo real**
4. Al cerrar la ronda, calcula qué carrera conquistó ese sector del mapa

---

## 💾 Persistencia de Datos

Las preguntas se guardan en `server/preguntas.json`. Este archivo:
- Se **carga automáticamente** al iniciar el servidor
- Se **actualiza** cada vez que el admin guarda una nueva pregunta
- **Sobrevive reinicios** del servidor (persistencia entre sesiones)

---

## 🌐 URLs de Producción

| Panel | URL |
|---|---|
| 🖥️ Auditorio (público) | https://conquista-relampago.onrender.com/ |
| 🎛️ Administrador | https://conquista-relampago.onrender.com/admin.html |
| 📱 Jugador (celular) | https://conquista-relampago.onrender.com/jugar.html |

---

*Desarrollado para UNIPAZ © 2026*
