# backend/Dockerfile

FROM node:18

# Ustaw katalog roboczy
WORKDIR /app

# Kopiuj package.json i package-lock.json
COPY package*.json ./

# Zainstaluj zależności
RUN npm install && npm install -g concurrently

# Kopiuj resztę plików backendu
COPY . .

# Upewnij się, że port 5000 jest otwarty (lub inny, jeśli zmienisz)
EXPOSE 5000

# Uruchom jednocześnie import danych, backend i SOAP
CMD ["concurrently", "node scripts/importBitcoinTrends.js", "node scripts/importGpuCsv.js", "npm start", "node soapService.js"]
