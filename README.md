# Кабинет товароведа — DEMO (без бэкенда)

Статичная копия рабочего дня товароведа из MirOpt Stats.  
Данные вымышленные (мок). Кнопки кликаются в браузере, на сервер ничего не уходит.

## Что внутри

| Экран | Зачем |
|--------|--------|
| 1. Анализ продаж | Ведомость, теплокарта дней, график цена/шт |
| 2. Сборка и остаток | Сборки, остатки |
| 3. Анализ закупки | Корзина закупки |
| 4. Паспорт / карточки / архив | Паспорт товара, передача менеджеру |
| 5. Проблемы с товаром | Список проблем |

## Как открыть у себя

Двойной клик по `index.html` **или** из папки:

```bash
# Python (если установлен)
python3 -m http.server 8080
# потом http://localhost:8080
```

## Как залить на бесплатный хостинг (для заказчицы)

### Вариант A — GitHub Pages (рекомендую)

1. Создай **новый** репозиторий на GitHub (например `kabinet-tovaroveda-demo`).
2. Залей **содержимое этой папки** в корень репозитория (`index.html` должен быть в корне).
3. Settings → Pages → Source: **Deploy from a branch** → ветка `main` / папка `/ (root)`.
4. Через пару минут ссылка вида:  
   `https://ТВОЙ-ЛОГИН.github.io/kabinet-tovaroveda-demo/`

Команды (из этой папки):

```bash
git init
git add .
git commit -m "demo: кабинет товароведа (статика)"
git branch -M main
git remote add origin https://github.com/ТВОЙ-ЛОГИН/kabinet-tovaroveda-demo.git
git push -u origin main
```

### Вариант B — Netlify Drop

1. Открой [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Перетащи всю папку `demo-kabinet-tovaroveda` на страницу
3. Получишь ссылку вида `https://что-то.netlify.app`

### Вариант C — Cloudflare Pages / Vercel

То же самое: новый проект → upload этой папки или git-репозиторий с `index.html` в корне.

## Структура

```
demo-kabinet-tovaroveda/
  index.html
  README.md
  css/
    app.css
    merchandiser_workflow_demo.css
  js/
    merchandiser_workflow_demo.js
```

## Важно сказать заказчице

- Это **макет с живыми кнопками**, не боевая система.
- Цифры и товары — учебные.
- Вход не нужен.
- Полная версия живёт в основном продукте MirOpt Stats (с 1С, мониторами Ozon/WB и т.д.).

## Откуда взято

Синхронизировано с демо в основном проекте:  
`/shops/merchandiser/demo/` (`merchandiser_workflow_demo.html` + css/js).
