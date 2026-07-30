# Random Mod Roulette

Современная рулетка случайных Minecraft-модов через Modrinth API. Каждая крутка заново получает моды, перемешивает ленту и останавливает CS:GO/casino-style анимацию на случайном победителе.

## Запуск

```bash
npm install
npm run dev
```

Откройте http://127.0.0.1:3000.

## Что внутри

- Next.js + React + TypeScript.
- Tailwind CSS.
- Server-side API route `/api/mods/random` с уникальным `User-Agent`.
- Server-side API route `/api/mods/install` для прямого скачивания `.jar` без перехода на страницу Modrinth.
- Server-side API route `/api/mods/versions` для выбора Minecraft-версии, loader и версии мода перед установкой.
- Server-side API route `/api/mods/pack` для сборки результата в `.mrpack` или `.zip`.
- Без базы данных, все данные берутся из Modrinth API v2.
- Фильтры по версии Minecraft, loader и категориям Modrinth.
- Переключатели видимости Minecraft-версий: релизы, снапшоты, beta и alpha; по умолчанию показываются только релизы.
- Кастомное количество модов в одном ящике рулетки, до 24 модов.
- Одна ячейка рулетки показывает сразу несколько иконок модов из будущего modpack.
- История последних 5 выпавших модов.

Кнопка установки открывает выбор версии Minecraft, loader и версии каждого мода. После этого можно скачать `.mrpack` для лаунчеров с поддержкой Modrinth modpack format или `.zip` с готовой папкой `mods/` и реальными файлами модов.
# random-mod-roulette
