package platform

import (
	"context"
	"database/sql"
	"time"
)

func OpenPostgres(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(12)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(20 * time.Minute)

	deadline, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	for {
		if err := db.PingContext(deadline); err == nil {
			return db, nil
		}

		if deadline.Err() != nil {
			_ = db.Close()
			return nil, deadline.Err()
		}

		time.Sleep(750 * time.Millisecond)
	}
}
