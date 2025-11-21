# chonky-prefect-server

ExpressJS backend for serving file system data to Chonky React frontend.

## Getting started

```text
npm i

cp env.template .env

npm run dev
```

## Docker

```text
# Create Docker Image
docker build -t base-express .

# Run Docker Image
docker run -p 3000:3000 -d base-express
```

## Made With

* tsx
* pkgroll
* Express
* multer
