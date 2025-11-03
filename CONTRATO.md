# Contrato de API — GreenData

## 1) Alcance y Versión
- Versión de API: v1 (estable)
- Base URL local: `http://localhost:3000/api/v1`
- Healthcheck (fuera de prefijo): `GET http://localhost:3000/health`
- Autenticación: no aplica (entorno académico local)

## 2) Convenciones de Respuesta
- Éxito: `{ "data": ... }`
- Error: `{ "error": string, "details"?: any }`
- Content-Type: `application/json`

## 3) Modelos y Tipos
- IDs Mongo: `ObjectId` (24 hex) para `Plant`, `Sensor`, `Threshold`, `Alert`.
- Sensor `type`: uno de `humidity | ph | temp | lux`.
- Threshold: `{ min: number, max: number, hysteresis?: number }` (min ≤ max).

## 4) Endpoints

- Plantas
  - GET `/plants?q=&limit=&offset=`
    - Filtros: `q` por nombre/tipo (case-insensitive)
    - Paginación: `limit` 1..100 (default 20), `offset` ≥ 0
    - Respuesta: `{ data: { items: Plant[], total, limit, offset } }`
  - POST `/plants`
    - Body: `{ name: string, type?: string }`
    - 201 → `{ data: Plant }`
  - GET `/plants/:id`
    - 200 → `{ data: Plant }` | 404
  - PATCH `/plants/:id`
    - Body: `{ name?: string, type?: string }` (al menos 1 campo)
    - 200 → `{ data: Plant }` | 404
  - DELETE `/plants/:id`
    - Borra en cascada `Sensor` y `Threshold`
    - 200 → `{ data: { deleted: true } }` | 404

- Sensores
  - GET `/plants/:plantId/sensors`
    - 200 → `{ data: Sensor[] }` | 404 si `plantId` no existe
  - POST `/plants/:plantId/sensors`
    - Body: `{ type: 'humidity'|'ph'|'temp'|'lux', unit?: string }`
    - 201 → `{ data: Sensor }` | 404 si `plantId` no existe
  - GET `/sensors/:sensorId`
    - 200 → `{ data: Sensor }` | 404
  - PATCH `/sensors/:sensorId`
    - Body: `{ type?: enum, unit?: string }` (al menos 1 campo)
    - 200 → `{ data: Sensor }` | 404
  - DELETE `/sensors/:sensorId`
    - Borra `Threshold` asociado
    - 200 → `{ data: { deleted: true } }` | 404

- Umbrales (por sensor)
  - GET `/sensors/:sensorId/threshold`
    - 200 → `{ data: Threshold }` | 404
  - PUT `/sensors/:sensorId/threshold`
    - Body: `{ min: number, max: number, hysteresis?: number }`
    - 200 → `{ data: Threshold }` | 404 si sensor no existe
  - DELETE `/sensors/:sensorId/threshold`
    - 200 → `{ data: { deleted: true } }` | 404

- Alertas (solo lectura)
  - GET `/alerts?plantId=&sensorId=&from=&to=&limit=`
    - `from`, `to`: ISO opcionales (filtran por `createdAt`)
    - 200 → `{ data: Alert[] }`

-- Histórico (Cassandra)
  - GET `/sensors/history?plant=&sensor=&limit=&from=&to=&maxPoints=`
    - Parámetros:
      - `plant`: string (ej. `p1`)
      - `sensor`: enum (`humidity|ph|temp|lux`)
      - `limit`: recorte duro de muestras crudas (máx. 50000, default 10000)
      - `from` (ISO/epoch) y `to` (ISO/epoch) opcionales: si se especifican, consulta todas las particiones diarias en el rango (máx. 31 días). Si no se especifican, se consulta hoy y, por desfases horarios, también ayer/mañana.
      - `maxPoints`: downsampling server-side del arreglo final (default = `limit`, máx. 50000)
    - Respuesta: `{ data: Array<{ tsISO: string, value: number }> }`
    - Notas:
      - Partición por día: `(plant_id, sensor_type, ymd)`; clustering `ts DESC`.
      - El backend ordena ascendente por `ts` y aplica downsampling por bloques (promedio por bucket).

  - Compatibilidad (Simulador Python)
  - POST `/plants/add`
    - Body: `{ plant: { name: string, type?: string }, sensors?: Array<{ id, type, scheduleMode, ... }>} `
    - 201 → `{ message: string, plant: any }` (formato legado, no `data`)
    - Solo para pruebas; no usar en el frontend.

  - Healthcheck
  - GET `/health` → `{ ok: true }`

  - Orden y Coincidencias
  - La ruta `/sensors/history` tiene prioridad sobre `/sensors/:sensorId` (se restringe `sensorId` a ObjectId en el router).

  - Ejemplos (cURL)
  - Crear planta:
    - `curl -X POST http://localhost:3000/api/v1/plants -H "Content-Type: application/json" -d '{"name":"Albahaca","type":"Hierba"}'`
  - Crear sensor:
    - `curl -X POST http://localhost:3000/api/v1/plants/<plantId>/sensors -H "Content-Type: application/json" -d '{"type":"humidity"}'`
  - Umbral:
    - `curl -X PUT http://localhost:3000/api/v1/sensors/<sensorId>/threshold -H "Content-Type: application/json" -d '{"min":30,"max":70,"hysteresis":2}'`
  - Histórico:
    - `curl "http://localhost:3000/api/v1/sensors/history?plant=p1&sensor=humidity&limit=10"`

  - Ejemplos (PowerShell)
  - `$base = "http://localhost:3000/api/v1"`
  - `Invoke-RestMethod "$base/plants?limit=10&offset=0" | ConvertTo-Json -Depth 5`

  - Errores (ejemplos)
  - Validación Zod: 400 → `{ "error": "ValidationError", "details": { ... } }`
  - Recurso no encontrado: 404 → `{ "error": "Plant not found" }`
  - Error interno: 500 → `{ "error": "Internal Server Error" }`

  - Reglas de Validación
  - Plant `name`: requerido (no vacío).
  - Sensor `type`: enum válida.
  - Threshold: `min ≤ max`, `hysteresis ≥ 0`.
  - Query `limit`: [1..100] en listados Mongo; hasta 50000 en histórico.

  - Índices y Rendimiento
  - Mongo:
    - Alerts: `plantId, createdAt DESC`
    - Threshold: `sensorId`
    - Sensor: `plantId`
  - Cassandra:
    - Lecturas: partición compuesta `(plant_id, sensor_type, ymd)` y clustering por tiempo DESC.

  - Eventos Socket.IO (contrato propuesto para Real‑Time)
  - Canal de alertas: `alerts:new`
    - Payload: `{ id?: string, plantId: string, plantName?: string, sensorId: string, sensorType: enum, value: number, ts: ISO|epoch, threshold?: {min?:number,max?:number} }`
  - Datos live de sensor (dos estilos):
    - Rooms: cliente emite `sensor:subscribe { plantId, sensor }`; servidor emite a room `sensor:data` → `{ plantId, sensor, tsISO, value }`.
    - Evento directo por canal: `sensor:data:<plantId>:<sensor>` → `{ tsISO, value }`.

## 5) Ambiente y Variables (.env)
- `PORT=3000`
- `MONGO_URI=mongodb://mongo:27017/greendata` (Docker) o `mongodb://localhost:27017/greendata` (local)
- `CASSANDRA_CONTACT_POINTS=127.0.0.1` (Node en host)
- `CASSANDRA_DATACENTER=datacenter1`
- `CASSANDRA_KEYSPACE=greendata`
- `SOCKET_IO_CORS_ORIGIN=*`

## 6) Levantamiento local
- Mongo y Cassandra (Docker):
  - `docker compose up -d mongo cassandra cassandra-init`
- API (dev):
  - `cd api && npm run dev`
- (Opcional) Insertar dato histórico:
  - `docker exec -it greendata-cassandra cqlsh -e "INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES ('p1','humidity', toDate(now()), toTimestamp(now()), 's1', 42.5);"`

## 7) Pruebas
- `cd api && npm run test` (Vitest + Supertest)

## 8) Versionado y Cambios
- Cualquier cambio incompatible → crear `/api/v2` y documentar en este contrato.
- Mantener compatibilidad de `/plants/add` solo para simulador mientras se use.

## 9) Ingesta de Lecturas (nuevo)
- POST `/readings`
  - Body: `{ plant: string, sensorType: 'humidity'|'ph'|'temp'|'lux', sensorId: string, value: number, ts?: ISO|epoch }`
  - 201 → `{ data: { inserted: 1 } }`
- POST `/readings/batch`
  - Body: `{ readings: Array<{ plant, sensorType, sensorId, value, ts? }>} `
  - 201 → `{ data: { inserted: N } }`
- Notas:
  - `ts` opcional: si no se envía, se usa el server time.
  - La API calcula `ymd` (LocalDate) y escribe en `greendata.readings`.
  - Esta ingesta aún no emite sockets ni genera alertas; el equipo de tiempo real podrá engancharse aquí.
