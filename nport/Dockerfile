FROM node:20-alpine

RUN npm install -g nport

# Automatically select English (1) for the language prompt
CMD sh -c "echo 1 | nport 5555 -s your_subdomain"
