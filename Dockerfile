FROM node:20-bullseye AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/craco.config.js frontend/jsconfig.json frontend/postcss.config.js frontend/tailwind.config.js frontend/components.json ./
COPY frontend/public ./public
COPY frontend/src ./src
COPY frontend/plugins ./plugins

RUN corepack enable && yarn install
ARG REACT_APP_BACKEND_URL=/api
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN yarn build

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/ready', timeout=4).read()" || exit 1

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
