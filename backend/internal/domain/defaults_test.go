package domain

import "testing"

func TestDefaultCategoriesAreUserScopedAndClearable(t *testing.T) {
	categories := DefaultCategories("user-1", LanguageRU)

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

func TestDefaultCategoriesFollowLanguage(t *testing.T) {
	ruCategories := DefaultCategories("user-1", LanguageRU)
	enCategories := DefaultCategories("user-1", LanguageEN)

	if ruCategories[0].Name != "Зарплата" {
		t.Fatalf("expected Russian category name, got %q", ruCategories[0].Name)
	}
	if enCategories[0].Name != "Salary" {
		t.Fatalf("expected English category name, got %q", enCategories[0].Name)
	}
}

func TestNormalizeLanguageFallsBackToRussian(t *testing.T) {
	if NormalizeLanguage("EN") != LanguageEN {
		t.Fatalf("expected EN to be supported")
	}
	if NormalizeLanguage("DE") != LanguageRU {
		t.Fatalf("expected unsupported language to fall back to RU")
	}
}
