# Vedlejší služba, která mluví s EduPage.
# Je oddělená schválně: EduPage nemá veřejné API a knihovna, která
# napodobuje mobilní aplikaci, existuje jen pro Python. Když se EduPage
# změní, stačí povýšit knihovnu místo ladění vlastního kódu.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health').read()"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
