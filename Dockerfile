FROM node:lts-slim

ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

ENV SERVE_VERSION 11.2.0
RUN npm install -g serve@${SERVE_VERSION}

WORKDIR /app

COPY package.json /app/package.json
RUN npm install
COPY . /app/
RUN npm run build

EXPOSE 3000

CMD ["serve", "-l", "3000", "-s", "build"]
