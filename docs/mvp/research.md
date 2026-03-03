# ВКС опции в РФ

[Статья](https://habr.com/ru/companies/hostkey/articles/949776/)

### WebRTC

Ниже перечислены базированные на WebRTC опенсорсы

- [BigBlueButton](https://www.google.com/search?q=BigBlueButton) - буквально ВКС платформа для обучения. Есть доска
- [Jitsi](https://meet.jit.si/) - база большинства ру ВКС решений
- [LiveKit](https://docs.livekit.io/intro/about/) - скелет для создания ВКС, есть LiveKit Cloud с демо. Есть поддержка ИИ в облаке
- [mediasoup](https://mediasoup.org/) - лоу левл WebRTC SFU framework. Тулкит для создания кастомного функционала
- [OpenVidu](https://www.google.com/search?q=OpenVidu) - жесткий фреймворк, надстройка над LiveKit и mediasoup. Есть встроенные [Live Captions](https://openvidu.io/latest/docs/ai/live-captions/)
- [Janus](https://github.com/meetecho/janus-gateway) - Janus Gateway сервер WebRTC, в отличие от Jitsi Meet сосредоточен на предоставлении низкоуровневого API для управления медиа-потоками, что делает его более гибким.  Для Janus доступна очень подробная [документация](https://janus.conf.meetecho.com/docs/modules.html) и много отдельных [демо](https://janus.conf.meetecho.com/demos/) [статья на хабре](https://habr.com/ru/articles/800699/)

### Доска

- [excalidraw](https://excalidraw.com/) + [mcp](https://github.com/excalidraw/excalidraw-mcp) - то что надо, математические блоки [есть](https://github.com/excalidraw/excalidraw/issues/10311) в превью версии (можно сделать как отдельный виджет-плагин [например](https://github.com/Just1truc/excalidraw-latex-gen))
- [tldraw](https://www.tldraw.com/) + [bad claude mcp](<[text](https://github.com/shahidhustles/tldraw-mcp)>) - по факту вк доска, но mcp нет. Хорошее SDK и можно кастомить
- Вырезать доску из BigBlueButton


## Что взять?

> OpenVidu может упростит жизнь, но также и ограничить кастомизацию.

- LiveKit: React SDK + Node SDK, [LiveKit Cloud](https://livekit.io/pricing#pricing-calculator) или self-hosted ([YandexSpeechKit](https://github.com/sergerdn/livekit-plugins-yandex) мб надо будет доработать бридж на яндекс).
    - Собрать MVP из React, вдохновляюсь BigBlueButton и Jitsi
    - Поставить Node бек (stun внутри, turn от LiveKit или [гугла](https://gist.github.com/zziuni/3741933) вроде пока работает)
    - Подцепить доску
    - [Подцепить ИИ](https://docs.livekit.io/agents/) в конфу + чат-бота
- Excalidraw:
    - Захостить коллаборативную доску
    - Впилить математические блоки из превью версии
    - Подключить к LiveKit через MCP
    - Подключить ИИ для распознавания формул

## ML: примеры моделей

ASR - openai/whisper-large-v3
VLM - Qwen/Qwen3-VL-8B-Instruct-GGUF