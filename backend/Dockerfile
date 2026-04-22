FROM node:20-slim

WORKDIR /app

# Install nodemon for development auto-reload
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
