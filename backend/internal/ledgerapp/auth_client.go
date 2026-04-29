package ledgerapp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"ledger/backend/internal/domain"
)

type Authenticator interface {
	Authenticate(ctx context.Context, authorization string) (domain.User, error)
}

type AuthClient struct {
	baseURL string
	client  *http.Client
}

func NewAuthClient(baseURL string) *AuthClient {
	return &AuthClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *AuthClient) Authenticate(ctx context.Context, authorization string) (domain.User, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/auth/session", nil)
	if err != nil {
		return domain.User{}, err
	}
	request.Header.Set("Authorization", authorization)

	response, err := c.client.Do(request)
	if err != nil {
		return domain.User{}, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return domain.User{}, errors.New("session is invalid")
	}

	var user domain.User
	if err := json.NewDecoder(response.Body).Decode(&user); err != nil {
		return domain.User{}, err
	}
	if !user.IsActive {
		return domain.User{}, errors.New("user is inactive")
	}

	return user, nil
}
