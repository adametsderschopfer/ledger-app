package platform

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func ReadJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func BearerToken(r *http.Request) (string, error) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return "", errors.New("missing authorization header")
	}

	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || strings.TrimSpace(token) == "" {
		return "", errors.New("invalid authorization header")
	}

	return token, nil
}

func NewID(prefix string) string {
	var bytes [18]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		panic(err)
	}

	return prefix + "-" + strings.TrimRight(base64.RawURLEncoding.EncodeToString(bytes[:]), "=")
}

func NewToken() string {
	var bytes [32]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		panic(err)
	}

	return base64.RawURLEncoding.EncodeToString(bytes[:])
}
