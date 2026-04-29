package domain

import "testing"

func TestDefaultCategoriesAreUserScopedAndClearable(t *testing.T) {
	categories := DefaultCategories("user-1")

	if len(categories) < 10 {
		t.Fatalf("expected base category set, got %d", len(categories))
	}

	for _, category := range categories {
		if category.UserID != "user-1" {
			t.Fatalf("category %s has user id %q", category.ID, category.UserID)
		}
		if category.IsSystem {
			t.Fatalf("default category %s must be clearable by the user", category.ID)
		}
	}
}
