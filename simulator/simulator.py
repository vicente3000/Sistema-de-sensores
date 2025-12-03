#!/usr/bin/env python3
import os
import time
import json
import random
import requests
from requests.exceptions import RequestException

API_URL = os.getenv("API_URL", "http://localhost:3000")

PLANTS_ENDPOINT = f"{API_URL}/api/v1/plants"
SENSORS_ENDPOINT = f"{API_URL}/api/v1/sensors"
READINGS_ENDPOINT = f"{API_URL}/api/v1/readings"
BATCH_ENDPOINT = f"{API_URL}/api/v1/readings/batch"

MAX_RETRIES = 5
RETRY_BACKOFF = 2  

SPEED_FILE = "simulator_speed.json"

def load_speed_config():
    """Lee el archivo simulator_speed.json en caliente."""
    try:
        with open(SPEED_FILE, "r") as f:
            cfg = json.load(f)
            return {
                "delay_ms": cfg.get("delay_ms", 200),
                "random_jitter_ms": cfg.get("random_jitter_ms", 0)
            }
    except FileNotFoundError:
        return {"delay_ms": 200, "random_jitter_ms": 0}
    except Exception:
        return {"delay_ms": 200, "random_jitter_ms": 0}

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
            r = requests.request(method, url, timeout=10, **kwargs)
            if r.status_code in (500, 502, 503, 504):
                raise RequestException(f"Server error {r.status_code}")
            return r
        except RequestException as e:
            wait = RETRY_BACKOFF ** attempt
            print(f"[WARN] {method.upper()} {url} failed ({e}), retry {attempt}/{MAX_RETRIES} in {wait}s")
            time.sleep(wait)
    print(f"[ERROR] {method.upper()} {url} failed after {MAX_RETRIES} retries")
    return None

def get_or_create_plant(name: str, type_: str = "hidroponico") -> str:
    res = request_with_retries("GET", PLANTS_ENDPOINT)
    plants = res.json().get("data", {}).get("items", []) if res else []
    for p in plants:
        if p.get("name") == name:
            print(f"[PLANT FOUND] {name} ({p.get('_id')})")
            return p.get("_id")

    payload = {"name": name, "type": type_}
    r = request_with_retries("POST", PLANTS_ENDPOINT, json=payload)
    plant_id = r.json().get("data", {}).get("_id")
    print(f"[PLANT CREATED] {name} ({plant_id})")
    return plant_id

def get_or_create_sensors(plant_id: str):
    default_sensors = [
        {"type": "humidity", "unit": "%", "min": 30, "max": 70},
        {"type": "ph", "unit": "pH", "min": 5.5, "max": 7.0},
        {"type": "temp", "unit": "°C", "min": 18, "max": 30},
        {"type": "lux", "unit": "lx", "min": 300, "max": 1500},
    ]

    created_sensors = []
    res = request_with_retries("GET", f"{PLANTS_ENDPOINT}/{plant_id}/sensors")
    sensors = res.json().get("data", {}).get("items", []) if res else []
    existing_types = [s.get("type") for s in sensors]

    for s in default_sensors:
        if s["type"] in existing_types:
            existing = next(x for x in sensors if x["type"] == s["type"])
            created_sensors.append(existing)
            continue

        payload = {"type": s["type"], "unit": s["unit"]}
        r = request_with_retries("POST", f"{PLANTS_ENDPOINT}/{plant_id}/sensors", json=payload)
        sensor = r.json().get("data")
        created_sensors.append(sensor)

        threshold_payload = {"min": s["min"], "max": s["max"]}
        request_with_retries("PUT", f"{SENSORS_ENDPOINT}/{sensor['_id']}/threshold", json=threshold_payload)

    return created_sensors

def send_batch(plant_id: str, sensors: list, batch_size: int = 50):
    readings = []
    base_ts = int(time.time() * 1000)

    for _ in range(batch_size):
        for s in sensors:
            readings.append({
                "plant": plant_id,
                "sensorId": s["_id"],
                "sensorType": s["type"],
                "value": generate_value(s["type"]),
                "ts": base_ts - random.randint(0, 800)
            })

    payload = {"readings": readings}
    r = request_with_retries("POST", BATCH_ENDPOINT, json=payload)

    if r and r.status_code in (200, 201):
        return True
    return False

def run_variable_speed_simulator(plant_name: str):
    print("[SIMULADOR] Iniciando simulador con control dinámico de velocidad...")

    plant_id = get_or_create_plant(plant_name)
    sensors = get_or_create_sensors(plant_id)

    while True:
        cfg = load_speed_config()
        delay = cfg["delay_ms"]
        jitter = cfg["random_jitter_ms"]

        real_delay = delay + random.randint(0, jitter)

        success = send_batch(plant_id, sensors, batch_size=1)

        if success:
            print(f"[OK] Lecturas enviadas | delay={real_delay}ms")
        else:
            print("[ERROR] Envío fallido")

        time.sleep(real_delay / 1000)

if __name__ == "__main__":
    run_variable_speed_simulator("Planta de Carga Dinámica")
