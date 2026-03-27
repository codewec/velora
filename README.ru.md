# Velora

Альтернативный веб-интерфейс для Zigbee2MQTT на `Vue 3`, `Vite`, `Pinia` и `@nuxt/ui`.

## Основные возможности

- список устройств в виде карточек и таблицы
- группировка по комнате, функции, типу, питанию и производителю
- сортировка по имени, сигналу, батарее и последнему появлению
- карта Zigbee-сети
- страницы устройства `Exposes / Info / State`
- поддержка Home Assistant add-on и standalone Docker

## Группировка по имени

Группировка по комнате использует шаблон имени устройства с плейсхолдерами.

Текущий шаблон по умолчанию:

```text
{room}_{type}_{placement}
```

Пример имени:

```text
living-room_switch_main
```

Где:

- `living-room` — комната
- `switch` — тип
- `main` — расположение

Это эвристическая группировка. Она зависит от того, насколько имя устройства соответствует шаблону именования.

## Разработка

```sh
pnpm install
cp .env.example .env
pnpm dev
```

## Полезные команды

```sh
pnpm dev
pnpm type-check
pnpm build
pnpm lint
```

## Standalone Docker

Сборка образа:

```sh
docker build -t velora .
```

Запуск с runtime-конфигом:

```sh
docker run --rm -p 8080:8080 \
  -e 'VELORA_CONNECTIONS_JSON=[{"id":"main","label":"Main","mode":"proxy","url":"/api/z2m/main/ws"}]' \
  -e 'VELORA_PROXY_TARGETS_JSON=[{"id":"main","label":"Main","target":"http://zigbee2mqtt:8080"}]' \
  velora
```

## Home Assistant add-on

Документация по add-on находится в [`velora/DOCS.md`](./velora/DOCS.md).

Коротко:

- add-on работает через ingress Home Assistant
- для подключения к Zigbee2MQTT используется `z2m_targets_json`
- target должен указывать на внутренний хост add-on Zigbee2MQTT

Пример:

```yaml
z2m_targets_json: "[{\"id\":\"main\",\"label\":\"Main\",\"target\":\"http://45df7312-zigbee2mqtt:8099\"}]"
```
