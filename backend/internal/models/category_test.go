package models

import (
	"reflect"
	"testing"
	"time"
)

func TestCategoryModel(t *testing.T) {
	// Устанавливаем фиксированное время для тестирования
	now := time.Now().UTC().Truncate(time.Second)

	// Создаем категорию для тестирования
	category := &Category{
		ID:        1,
		UserID:    2,
		Name:      "Работа",
		Color:     "#4a6bff",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Проверяем соответствие полей
	tests := []struct {
		name     string
		got      interface{}
		expected interface{}
	}{
		{"ID", category.ID, uint(1)},
		{"UserID", category.UserID, uint(2)},
		{"Name", category.Name, "Работа"},
		{"Color", category.Color, "#4a6bff"},
		{"CreatedAt", category.CreatedAt, now},
		{"UpdatedAt", category.UpdatedAt, now},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !reflect.DeepEqual(tt.got, tt.expected) {
				t.Errorf("Category.%s = %v, хотели %v", tt.name, tt.got, tt.expected)
			}
		})
	}
}

func TestCategoryDefaults(t *testing.T) {
	// Проверяем поведение с пустыми полями
	category := &Category{
		ID:     1,
		UserID: 2,
		Name:   "Без цвета",
	}

	// Имя категории не может быть пустым
	if category.Name == "" {
		t.Error("Имя категории не может быть пустым")
	}

	// Проверяем, что цвет может быть пустым (это нормально)
	if category.Color != "" {
		t.Errorf("Ожидался пустой цвет, получен %s", category.Color)
	}
}
