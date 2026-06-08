# AI agents dashboard

Локальный веб-сервис аналитики обращений ИИ-агентов к страницам сайта.

## Запуск

```bash
docker compose up --build
```

Откройте [http://localhost:5177](http://localhost:5177).

## Локальная разработка

```bash
npm install
npm run dev
```

Vite будет доступен на [http://localhost:5177](http://localhost:5177).

## GitHub Pages

Для репозитория `ai-analytics` workflow собирает приложение с base path `/ai-analytics/`.

1. Создайте GitHub-репозиторий `ai-analytics`.
2. Запушьте код в ветку `main`.
3. В настройках репозитория откройте `Settings -> Pages`.
4. В `Build and deployment` выберите `Source: GitHub Actions`.

После успешного workflow приложение будет доступно по адресу:

```text
https://<github-username>.github.io/ai-analytics/
```

Локальный Docker-запуск при этом остается на [http://localhost:5177](http://localhost:5177).
