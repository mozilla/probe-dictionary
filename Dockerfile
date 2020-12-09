FROM node:lts-slim

ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

ENV SERVE_VERSION 11.3.2
RUN yarn global add serve@${SERVE_VERSION}

WORKDIR /app

COPY package.json yarn.lock /app/
RUN yarn
COPY . /app/
RUN yarn run build

EXPOSE 3000

CMD ["serve", "-l", "3000", "-s", "build"]
