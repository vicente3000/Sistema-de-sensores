import requests
from faker import Faker
import random
import time
from datetime import datetime

# Configuración
api_url = "http://localhost:3000/plants/add"  # Cambia esto si tu API está en otro puerto
fake = Faker()

# Función para generar sensores
def generate_sensor():
    sensor_types = ['humidity', 'ph', 'temp', 'lux']
    schedule_modes = ['predefinida', 'horario', 'rango']

    sensor = {
        "id": fake.uuid4(),
        "type": random.choice(sensor_types),
        "scheduleMode": random.choice(schedule_modes),
        "everyHours": random.randint(1, 24) if random.choice(schedule_modes) == 'predefinida' else None,
        "fixedTimes": ','.join([f'{random.randint(0, 23)}:{random.randint(0, 59)}' for _ in range(3)]) if random.choice(schedule_modes) == 'horario' else None,
        "rangeStart": f"{random.randint(0, 23)}:{random.randint(0, 59)}" if random.choice(schedule_modes) == 'rango' else None,
        "rangeEnd": f"{random.randint(0, 23)}:{random.randint(0, 59)}" if random.choice(schedule_modes) == 'rango' else None,
        "rangeCount": random.randint(1, 10) if random.choice(schedule_modes) == 'rango' else None,
        "thresholdMin": round(random.uniform(10.0, 40.0), 2),
        "thresholdMax": round(random.uniform(40.0, 80.0), 2)
    }
    return sensor

# Función para enviar una planta con sensores
def send_plant_with_sensors():
    plant = {
        "plant": {
            "name": fake.name(),
            "type": random.choice(['Tomato', 'Cucumber', 'Lettuce', 'Pepper', 'Basil'])
        },
        "sensors": [generate_sensor() for _ in range(random.randint(1, 3))]
    }

    response = requests.post(api_url, json=plant)
    if response.status_code == 201:
        print(f"Planta '{plant['plant']['name']}' enviada correctamente.")
    else:
        print(f"Error al enviar la planta: {response.status_code}")

# Simulador: Enviar plantas cada 10 segundos
def simulate():
    while True:
        send_plant_with_sensors()
        time.sleep(10)  # Espera 10 segundos antes de enviar la siguiente planta

if __name__ == "__main__":
    print("Simulando plantas con sensores...")
    simulate()
