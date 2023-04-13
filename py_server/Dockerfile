FROM python:3.9.16

WORKDIR  /app

RUN apt-get update && apt-get install -y wget unzip libgconf-2-4 libnss3 libcurl4

RUN pip install --no-cache-dir -U pip

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY  . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]