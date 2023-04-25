FROM python:3.9.16

FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11                                                                       

ENV PORT=5000

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY  . .