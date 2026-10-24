package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Symptoms people add themselves, as a list of {"label", "icon"} on each day
// they're logged (backend/app/days.go checks the shape). The app lists them
// from the days, so there's nothing else to keep in step.
func init() {
	m.Register(func(app core.App) error {
		days, err := app.FindCollectionByNameOrId("days")
		if err != nil {
			return err
		}
		days.Fields.Add(&core.JSONField{Name: "custom_symptoms", MaxSize: 4000})
		return app.Save(days)
	}, func(app core.App) error {
		days, err := app.FindCollectionByNameOrId("days")
		if err != nil {
			return err
		}
		days.Fields.RemoveByName("custom_symptoms")
		return app.Save(days)
	})
}
