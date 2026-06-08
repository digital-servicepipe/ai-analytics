# Формат CSV

CSV должен быть в UTF-8 и содержать обязательные колонки:

```csv
datetime,http_user_agent,uniq_id,path,cresp_country,cresp_asn,cresp_subnet,bot_type
2026-05-25 19:30:48.888000000,"Mozilla/5.0",abc-1,/web-ddos-protection,RU,12345,10.0.0.0/24,ChatGPT-User
```

Дополнительные колонки допускаются и игнорируются. Если `datetime` не распарсился, строка остается в данных, но дата отображается как `Unknown`.
