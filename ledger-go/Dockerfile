FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .

ARG SERVICE
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/app ./cmd/${SERVICE}

FROM alpine:3.20

RUN addgroup -S ledger && adduser -S ledger -G ledger
USER ledger
COPY --from=build /out/app /app

ENTRYPOINT ["/app"]
