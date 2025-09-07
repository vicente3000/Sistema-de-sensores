# 🌱 GreenData

**GreenData** es una plataforma web para el monitoreo de hasta 100 plantas mediante sensores de **humedad, pH, temperatura y luminosidad**.  
El sistema permite registrar lecturas en tiempo real, generar **alertas en tres niveles** (normal, grave, crítica), gestionar plantas/sensores/umbrales y consultar históricos con visualizaciones interactivas.

---

## 🚀 Tecnologías utilizadas

### Back-end
- **Node.js + Express** → API REST para configuración y consultas.
- **Socket.IO** → comunicación en tiempo real (alertas y lecturas).
- **JavaScript + TypeScript** → escritura tipada y mantenible del backend.

### Bases de datos NoSQL
- **MongoDB (documental)** →  
  - Configuración de plantas, sensores y umbrales.  
  - Registro de alertas y bitácora de eventos.
- **Apache Cassandra (wide-column)** →  
  - Almacenamiento de lecturas de sensores en grandes volúmenes.  
  - Consultas históricas rápidas por planta, sensor y rango de fechas.

### Front-end
- **React + Vite** → interfaz modular, rápida y moderna.  
- **Recharts** → gráficos interactivos y filtrables para lecturas históricas y alertas.

### Otros
- **Docker Compose** → despliegue unificado de front, back y bases de datos.  
- **Python (scripts/simulador)** → generación de datos de sensores y pruebas de carga.

---

## 📡 Arquitectura y comunicación

La arquitectura sigue el patrón **CQRS + Event-Driven**:

1. **Ingestor**  
   - Recibe datos de sensores o del simulador.  
   - Publica eventos de lectura en una **cola de mensajería** (RabbitMQ/Kafka).

2. **Processor**  
   - Consume eventos desde la cola.  
   - Persiste lecturas en **Cassandra**.  
   - Evalúa umbrales y genera alertas.  
   - Envía alertas al **API/Config** para almacenarlas en **MongoDB** y difundirlas en tiempo real.

3. **API/Config**  
   - Expone endpoints REST para CRUD de plantas, sensores y umbrales.  
   - Gestiona la bitácora de alertas en MongoDB.  
   - Publica notificaciones por **Socket.IO** hacia el front-end.  

4. **Front-end (React)**  
   - Consume endpoints REST para históricos y configuraciones.  
   - Escucha notificaciones en tiempo real vía Socket.IO (alertas y nuevas lecturas).  

---

## 🔗 Flujo de datos

```mermaid
flowchart LR
  subgraph Frontend [React + Vite + Recharts]
    UI[UI] -- Socket.IO --> APIWS[API/Config WS]
    UI -- REST --> API[API/Config REST]
  end

  SENS[Sensores/Simulador] -- HTTP/WS --> ING[Ingestor]
  ING -- Evento Lectura --> MQ[(Cola/Stream)]
  MQ --> PROC[Processor]
  PROC -- Escrituras batch --> CAS[(Cassandra)]
  PROC -- Alerta --> API
  API -- Config/Bitácora --> MONGO[(MongoDB)]
