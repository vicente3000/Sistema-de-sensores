#!/usr/bin/env python3
import os
import time
import json
import random
import requests
from requests.exceptions import RequestException

# ---------------------------------------------------------
# Configuración
# ---------------------------------------------------------
API_URL = os.getenv("API_URL", "http://localhost:3000")

PLANTS_ENDPOINT = f"{API_URL}/api/v1/plants"
SENSORS_ENDPOINT = f"{API_URL}/api/v1/sensors"
READINGS_ENDPOINT = f"{API_URL}/api/v1/readings"
BATCH_ENDPOINT = f"{API_URL}/api/v1/readings/batch"
# El contrato dice PUT /sensors/:sensorId/threshold

MAX_RETRIES = 5
RETRY_BACKOFF = 2  # segundos, multiplicativo

# ---------------------------------------------------------
# Generadores de valores realistas
# ---------------------------------------------------------
def generate_value(sensor_type: str) -> float:
    if sensor_type == "humidity":
        return round(random.uniform(20, 80), 2)
    if sensor_type == "ph":
        return round(random.uniform(5.0, 7.5), 2)
    if sensor_type == "temp":
        return round(random.uniform(15, 35), 2)
    if sensor_type == "lux":
        return round(random.uniform(200, 2000), 2)
    return round(random.uniform(0, 100), 2)

# ---------------------------------------------------------
# Requests con reintentos
# ---------------------------------------------------------
def request_with_retries(method, url, **kwargs):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.request(method, url, timeout=10, **kwargs) # Aumentado a 10s para batches
            if r.status_code in (500, 502, 503, 504):
                raise RequestException(f"Server error {r.status_code}")
            return r
        except RequestException as e:
            wait = RETRY_BACKOFF ** attempt
            print(f"[WARN] {method.upper()} {url} failed ({e}), retry {attempt}/{MAX_RETRIES} in {wait}s")
            time.sleep(wait)
    print(f"[ERROR] {method.upper()} {url} failed after {MAX_RETRIES} retries")
    return None

# ---------------------------------------------------------
# Helpers para crear planta y sensores
# ---------------------------------------------------------
def get_or_create_plant(name: str, type_: str = "hidroponico") -> str:
    res = request_with_retries("GET", PLANTS_ENDPOINT)
    plants = res.json().get("data", {}).get("items", []) if res else []
    for p in plants:
        if p.get("name") == name:
            print(f"[PLANT FOUND] {name} ({p.get('_id')})")
            return p.get("_id")

    payload = {"name": name, "type": type_}
    r = request_with_retries("POST", PLANTS_ENDPOINT, json=payload)
    if r and r.status_code == 201:
        plant_id = r.json().get("data", {}).get("_id")
        print(f"[PLANT CREATED] {name} ({plant_id})")
        return plant_id
    raise RuntimeError(f"No se pudo crear planta {name}")

def get_or_create_sensors(plant_id: str):
    default_sensors = [
        {"type": "humidity", "unit": "%", "min": 30, "max": 70},
        {"type": "ph", "unit": "pH", "min": 5.5, "max": 7.0},
        {"type": "temp", "unit": "°C", "min": 18, "max": 30},
        {"type": "lux", "unit": "lx", "min": 300, "max": 1500},
    ]

    created_sensors = []

    # Cargar sensores existentes
    res = request_with_retries("GET", f"{PLANTS_ENDPOINT}/{plant_id}/sensors")
    sensors = res.json().get("data", {}).get("items", []) if res else []
    existing_types = [s.get("type") for s in sensors]

    for s in default_sensors:
        if s["type"] in existing_types:
            existing = next(filter(lambda x: x.get("type") == s["type"], sensors))
            created_sensors.append(existing)
            continue
        
        # El contrato dice POST /plants/:plantId/sensors
        payload = {"type": s["type"], "unit": s["unit"]}
        r = request_with_retries("POST", f"{PLANTS_ENDPOINT}/{plant_id}/sensors", json=payload)
        sensor = r.json().get("data") if r else None
        
        if sensor:
            created_sensors.append(sensor)
            print(f"[SENSOR CREATED] {s['type']} ({sensor.get('_id')})")
            
            # Crear umbral (Según contrato: PUT /sensors/:sensorId/threshold)
            threshold_payload = {"min": s["min"], "max": s["max"]}
            t_r = request_with_retries("PUT", f"{SENSORS_ENDPOINT}/{sensor['_id']}/threshold", json=threshold_payload)
            
            if t_r and t_r.status_code in (200, 201):
                print(f"  -> Threshold creado ({t_r.status_code})")
            else:
                print(f"  -> [WARN] No se pudo crear threshold para {s['type']}")
        else:
            print(f"[WARN] No se pudo crear sensor {s['type']}")

    return created_sensors

# ---------------------------------------------------------
# Envío de lecturas
# ---------------------------------------------------------
def send_reading(plant_id: str, sensor: dict):
    # (Tu función original... no se usa en el modo batch)
    pass

def send_batch(plant_id: str, sensors: list, batch_size: int = 50):
    readings = []
    # Usamos un timestamp base para el lote, con pequeñas variaciones
    base_ts = int(time.time() * 1000)
    
    for _ in range(batch_size):
        for s in sensors:
            if not s or "_id" not in s:
                continue
            readings.append({
                # ==================================================
                # CORRECCIÓN: De 'plantId' a 'plant' para OpenAPI
                # ==================================================
                "plant": plant_id,
                "sensorId": s["_id"],
                "sensorType": s["type"],
                "value": generate_value(s["type"]),
                # Simulamos que las lecturas no ocurrieron exactamente al mismo ms
                "ts": base_ts - random.randint(0, 1000) 
            })
    
    if not readings:
        print("[WARN] No hay lecturas para enviar en batch")
        return False

    payload = {"readings": readings}
    start_time = time.time()
    r = request_with_retries("POST", BATCH_ENDPOINT, json=payload)
    end_time = time.time()

    if r and r.status_code in (200, 201):
        print(f"[BATCH OK] {len(readings)} lecturas enviadas en {end_time - start_time:.2f}s (status: {r.status_code})")
        return True
    else:
        print(f"[ERROR] Batch fallido (Status: {r.status_code if r else 'N/A'})")
        return False

# ---------------------------------------------------------
# Ciclo principal (Simulador)
# ---------------------------------------------------------
def run_simulator(plant_name: str, interval_sec: float = 1.0, batch_mode=False):
    # (Tu función original... no la usaremos para la prueba de carga)
    pass

# ---------------------------------------------------------
# CLI
# ---------------------------------------------------------
if __name__ == "__main__":
    # --- MODO SIMULADOR (bucle infinito) ---
    # Descomenta la siguiente línea si quieres el simulador normal:
    # run_simulator("Invernadero Central", interval_sec=2, batch_mode=False)

    # --- MODO TEST DE CARGA (10.000 registros y termina) ---
    print("--- Iniciando Test de Carga (10.000 registros) ---")
    
    # 1. Crear planta y sensores
    try:
        plant_id = get_or_create_plant("Planta de Carga")
        sensors = get_or_create_sensors(plant_id)
    except Exception as e:
        print(f"[FATAL] Error al crear planta/sensores: {e}. ¿Está la API corriendo?")
        exit(1)

    if not sensors or len(sensors) < 4:
        print("[ERROR] No se pudieron crear los 4 sensores. Abortando.")
        exit(1)

    print(f"\n[INFO] Planta: {plant_id}")
    print(f"[INFO] Sensores: {[s.get('type') for s in sensors]}")
    
    # 2. Enviar 10.000 registros
    # La función send_batch(batch_size=50) envía (50 iteraciones * 4 sensores) = 200 lecturas.
    # Para enviar 10.000 lecturas, necesitamos llamarla 50 veces.
    # (50 llamadas * 200 lecturas/llamada) = 10.000 lecturas
    
    total_readings_to_send = 10000
    # batch_size=50 en la función send_batch
    readings_per_batch = 50 * len(sensors) 
    num_batches_needed = total_readings_to_send // readings_per_batch 

    print(f"[INFO] Se enviarán {num_batches_needed} lotes de {readings_per_batch} lecturas cada uno.")
    start_load_test = time.time()
    batches_ok = 0

    for i in range(num_batches_needed):
        print(f"--- Enviando Lote {i+1}/{num_batches_needed} ---")
        if send_batch(plant_id, sensors, batch_size=50):
            batches_ok += 1
        else:
            print("[ERROR] Lote fallido. Abortando el resto de la prueba.")
            break
        
        # Opcional: un pequeño sleep para no saturar la red,
        # pero para una prueba de carga real, mantenlo comentado.
        # time.sleep(0.1) 

    end_load_test = time.time()
    total_time = end_load_test - start_load_test
    total_sent = batches_ok * readings_per_batch

    print("\n--- Test de Carga Finalizado ---")
    print(f"Total enviado: {total_sent} registros")
    print(f"Tiempo total: {total_time:.2f} segundos")
    if total_time > 0:
        print(f"Rendimiento (RPS): {total_sent / total_time:.2f} lecturas/segundo")