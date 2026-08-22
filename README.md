# Кабинет товароведа — DEMO (статика)

Автономная копия демо-кабинета из MirOptStats. Только вёрстка и мок-данные в браузере — сервер не нужен.

## Что внутри

| Файл | Назначение |
|------|------------|
| `index.html` | Страница демо |
| `css/merchandiser_workflow_demo.css` | Стили |
| `js/merchandiser_workflow_demo.js` | Логика, табы, моки |

## Локально

Откройте `index.html` в браузере или поднимите простой сервер:

```bash
cd merchandiser-demo
python3 -m http.server 8080
# http://localhost:8080
```

## GitHub Pages (бесплатный хостинг)

1. Создайте **новый** публичный репозиторий на GitHub (например `merchandiser-demo`).
2. Скопируйте **содержимое** этой папки в корень репозитория (не всю папку `miroptstats`, а только файлы из `merchandiser-demo/`).
3. Закоммитьте и запушьте в ветку `main`.
4. В репозитории: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root)** → Save.
5. Через 1–2 минуты сайт будет по адресу `https://<ваш-логин>.github.io/<имя-репо>/`.

Файл `.nojekyll` уже лежит в папке — GitHub не будет пропускать файлы, начинающиеся с `_`.

### Вариант: папка внутри большого репо

Если пушите весь `miroptstats`, в Pages укажите папку `/merchandiser-demo` вместо root. URL будет `https://<логин>.github.io/<репо>/merchandiser-demo/` — пути к css/js от этого не ломаются.

## Обновление из основного проекта

После правок в Django-версии:

```bash
cp djangoapp/static/css/merchandiser_workflow_demo.css merchandiser-demo/css/
cp djangoapp/static/js/merchandiser_workflow_demo.js merchandiser-demo/js/
# HTML: контент из marketplaces/templates/marketplaces/merchandiser_workflow_demo.html
# (блок {% block content %}, без Django-тегов) — вставить в index.html между <div class="demo-shell"> и </div>
```

## Ограничения

- Нет входа, нет API, нет 1С — всё на моках в JS.
- Состояние частично хранится в `localStorage` браузера.
