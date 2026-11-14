<div align="center">

<img src="docs/icon.png" width="128" height="128" alt="Fenura">

# Fenura

**Музыкальный плеер для ВКонтакте на Windows**

Ваша музыка, плейлисты и рекомендации в одном красивом окне.<br>
Обои, матовое стекло, живой фон и ночной режим — спокойно для глаз даже ночью.

[![Release](https://img.shields.io/github/v/release/pxdxx/Fenura-vkmusic?style=flat-square&color=7aa7ff)](https://github.com/pxdxx/Fenura-vkmusic/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-a996ff?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-5fd3a8?style=flat-square&logo=windows&logoColor=white)](#скачать)
[![Build](https://img.shields.io/github/actions/workflow/status/pxdxx/Fenura-vkmusic/build.yml?style=flat-square&label=build)](https://github.com/pxdxx/Fenura-vkmusic/actions/workflows/build.yml)

[![Downloads](https://img.shields.io/github/downloads/pxdxx/Fenura-vkmusic/total?style=for-the-badge&color=7aa7ff&label=%D1%81%D0%BA%D0%B0%D1%87%D0%B0%D0%BD%D0%BE)](https://github.com/pxdxx/Fenura-vkmusic/releases)
[![Stars](https://img.shields.io/github/stars/pxdxx/Fenura-vkmusic?style=for-the-badge&color=f0b860&label=%D0%B7%D0%B2%D1%91%D0%B7%D0%B4%D1%8B)](https://github.com/pxdxx/Fenura-vkmusic/stargazers)

<a href="https://github.com/pxdxx/Fenura-vkmusic/releases/latest/download/Fenura-Setup.exe">
  <img src="https://img.shields.io/badge/%D0%A1%D0%BA%D0%B0%D1%87%D0%B0%D1%82%D1%8C-Windows%20.exe-7aa7ff?style=for-the-badge&logo=windows&logoColor=white" alt="Скачать для Windows">
</a>

[Возможности](#возможности) · [Скачать](#скачать) · [Сборка](#сборка-из-исходников) · [Ограничения](#ограничения)

</div>

<p align="center">
  <img src="docs/screenshots/main.jpg" width="820" alt="Fenura, главное окно">
</p>

<p align="center">
  <img src="docs/screenshots/recommendations.jpg" width="405" alt="Раздел «Для вас» с обоями «Луна»">
  <img src="docs/screenshots/moon.jpg" width="405" alt="Пустой фон и живой фон «Луна»">
</p>

<p align="center">
  <img src="docs/screenshots/settings.jpg" width="405" alt="Настройки">
  <img src="docs/screenshots/nowplaying.jpg" width="405" alt="Сейчас играет">
</p>

## Возможности

- **Вся музыка ВКонтакте:** моя музыка, плейлисты, поиск, «Для вас» и «Популярное». Вход через страницу ВК, пароль приложение не видит.
- **Обои и матовое стекло.** 9 встроенных обоев, пустой фон или своя картинка. Затемнение, размытие и прозрачность панелей настраиваются.
- **Живой фон:** звёзды, созвездия, звездопад, снег, дождь, светлячки и луна.
- **Ночной режим:** тёмная тема по расписанию и тёплый фильтр, который убирает синий свет.
- **Сейчас играет** на весь экран, **таймер сна** и плавная пауза.
- **Акцентный цвет** от обоев, из обложки трека или свой.
- Медиа-клавиши и панель громкости Windows, горячие клавиши, лёгкий расход ресурсов.

## Скачать

| Система | Файл |
| --- | --- |
| Windows 10 и 11, 64 бита | [`Fenura-Setup.exe`](https://github.com/pxdxx/Fenura-vkmusic/releases/latest/download/Fenura-Setup.exe) |

1. Запустите `Fenura-Setup.exe` и выберите папку установки.
2. Установщик не подписан, поэтому SmartScreen может показать «Система Windows защитила ваш компьютер». Нажмите **«Подробнее»**, затем **«Выполнить в любом случае»**.
3. Войдите во ВКонтакте в открывшемся окне — библиотека загрузится сама.

### Горячие клавиши

| Действие | Клавиши |
| --- | --- |
| Играть / пауза | `Пробел` |
| Следующий / предыдущий | `Ctrl` + `→` / `←` |
| Громкость | `Ctrl` + `↑` / `↓` |
| Поиск | `Ctrl` + `F` |
| Сейчас играет | `Ctrl` + `P` |
| Настройки | `Ctrl` + `,` |

## Сборка из исходников

Нужен [Node.js](https://nodejs.org/) 22 или новее.

```bash
npm install
npm start          # запуск
npm run demo       # демо без ВКонтакте, с вымышленными треками
npm test           # тесты
npm run dist       # установщик в dist/
```

## Ограничения

- Fenura — **плеер, а не загрузчик**: треки только воспроизводятся потоком.
- Это **неофициальный клиент**, он не связан с ВКонтакте. Если ВК изменит способ отдачи музыки, понадобится обновление.
- Токен и куки хранятся только на вашем компьютере (защищённое хранилище Windows), выход из аккаунта их удаляет.

## Связь

- Telegram: [@pxdxz](https://t.me/pxdxz)
- Нашли ошибку — откройте [issue](https://github.com/pxdxx/Fenura-vkmusic/issues).

## Лицензия

[MIT](LICENSE) © 2026 pxdxx
