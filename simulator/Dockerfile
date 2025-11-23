FROM python:3.11-slim

# Evita problemas con stdout buffer
ENV PYTHONUNBUFFERED=1

WORKDIR /app


COPY simulator.py .


COPY simulator_speed.json simulator_speed.json


RUN pip install --no-cache-dir requests


ENV API_URL=http://api:3000

CMD ["python", "simulator.py"]
