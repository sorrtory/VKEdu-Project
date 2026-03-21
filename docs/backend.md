# Backend

```bash
cd backend
yarn start
```


Test /send endpoint:

change `input.png` to your image file path

```bash
curl -X POST http://localhost:3000/send \                                                                                                                                 
  -F "image=@input.png" \
  -F "message=hello"
```
<!-- {"success":true,"filename":"input.png","mimetype":"image/png","size":18441,"body":{"message":"hello"}}%  -->