FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 6666

CMD ["npm", "run", "dev", "--", "--host"]
