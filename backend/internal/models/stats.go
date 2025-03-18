package models

// UserStats представляет статистику пользователя за период
type UserStats struct {
	Entries       []*TimeEntry `json:"entries"`
	TotalDuration int64        `json:"total_duration"`
}
