FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create wallet mount point
RUN mkdir -p /wallet

# Default env vars (override in docker-compose or at runtime)
ENV ORACLE_CLIENT_DIR=""
ENV ORACLE_CONFIG_DIR="/wallet"
ENV ORACLE_WALLET_DIR="/wallet"
ENV CORS_ORIGINS="http://localhost:4200,http://localhost"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
