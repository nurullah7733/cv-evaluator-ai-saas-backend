FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

# production command
CMD ["npm", "start"]

# development command
# CMD ["npm", "run", "server"]