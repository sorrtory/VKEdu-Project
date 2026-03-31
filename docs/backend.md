# Backend

## Tips and commands

To start the backend server:

```bash
cd backend
yarn start
```


### Test /send endpoint:

Test /send endpoint:

change `input.png` to your image file path

```bash
curl -X POST http://localhost:3000/send \
  -F "file=@input.png" \
  -F "message=hello"
```

<!-- {"success":true,"filename":"input.png","mimetype":"image/png","size":18441,"body":{"message":"hello"}}%  -->

### kafka

announce topic

```bash
docker exec -it broker /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic boardEvent \
  --bootstrap-server broker:29092 \
  --partitions 1 \
  --replication-factor 1
```

check topic

```bash
docker exec -it broker /opt/kafka/bin/kafka-topics.sh \
  --describe \
  --topic boardEvent \
  --bootstrap-server broker:29092
```
