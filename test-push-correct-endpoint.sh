#!/bin/bash
# Test push notification with correct endpoint URL

curl -X POST 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0' \
  -H 'Content-Type: application/json' \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'

