FROM docker.io/library/python:3.14-slim

WORKDIR /app

# sqlite3 CLI, so the seeded database can be inspected inside the container
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000
CMD ["python", "app.py"]
