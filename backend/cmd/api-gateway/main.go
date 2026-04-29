package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

func main() {
	authProxy := reverseProxy(platform.Env("AUTH_SERVICE_URL", "http://localhost:8081"))
	ledgerProxy := reverseProxy(platform.Env("LEDGER_SERVICE_URL", "http://localhost:8082"))

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		platform.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/app/config", func(w http.ResponseWriter, _ *http.Request) {
		platform.WriteJSON(w, http.StatusOK, domain.AppConfig{
			Language:           domain.NormalizeLanguage(platform.Env("APP_LANGUAGE", "RU")),
			SupportedLanguages: domain.SupportedLanguages,
		})
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/api/auth/"), strings.HasPrefix(r.URL.Path, "/api/server/"):
			authProxy.ServeHTTP(w, r)
		case strings.HasPrefix(r.URL.Path, "/api/ledger/"):
			ledgerProxy.ServeHTTP(w, r)
		default:
			platform.WriteError(w, http.StatusNotFound, "route was not found")
		}
	})

	addr := ":" + platform.Env("PORT", "8080")
	log.Printf("api-gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}

func reverseProxy(rawURL string) *httputil.ReverseProxy {
	target, err := url.Parse(rawURL)
	if err != nil {
		log.Fatalf("parse upstream %q: %v", rawURL, err)
	}
	return httputil.NewSingleHostReverseProxy(target)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
