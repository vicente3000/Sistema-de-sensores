FROM python:3.11-slim

WORKDIR /app

COPY simulator.py .

RUN pip install requests

ENV API_URL=http://api:3000

CMD ["python", "simulator.py"]
