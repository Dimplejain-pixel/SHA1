FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/backend

# System dependencies for ML and OCR libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt /tmp/requirements.txt

# Install matching CPU-only PyTorch packages
RUN pip install --no-cache-dir --timeout=300 --retries=10 \
    torch==2.14.1 torchvision==0.29.1 \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
RUN sed -e '/^[[:space:]]*torch[<=>~!]/d' \
        -e '/^[[:space:]]*torchvision[<=>~!]/d' \
        /tmp/requirements.txt > /tmp/requirements-no-torch.txt \
    && pip install --no-cache-dir -r /tmp/requirements-no-torch.txt

# Copy backend application
COPY backend/ ./

# Copy trained ML models
COPY trained_models/ /app/trained_models/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
