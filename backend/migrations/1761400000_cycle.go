package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// The symptoms and moods someone can log for a day. The web app shows them in this
// order (web/src/lib/log.ts has their labels).
var (
	symptoms = []string{"cramps", "headache", "backache", "bloating", "tender_breasts", "acne",
		"fatigue", "nausea", "cravings", "insomnia", "discharge"}
	moods = []string{"happy", "calm", "energetic", "sensitive", "sad", "anxious", "irritable", "tired"}
)

// The cycle tracker. Each person has their own settings on their user record and
// one "days" record per day they log something. Only they can see their days.
func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.Fields.Add(
			// typical lengths in days, used until there are logged periods to learn from
			&core.NumberField{Name: "cycle_length", Min: types.Pointer(15.0), Max: types.Pointer(60.0), OnlyInt: true},
			&core.NumberField{Name: "period_length", Min: types.Pointer(1.0), Max: types.Pointer(15.0), OnlyInt: true},
			&core.NumberField{Name: "luteal_length", Min: types.Pointer(7.0), Max: types.Pointer(20.0), OnlyInt: true},
			// daily reminders, sent by the "reminders" job (backend/app/reminders.go)
			&core.BoolField{Name: "remind_period"},
			&core.BoolField{Name: "remind_fertile"},
			&core.BoolField{Name: "remind_pill"},
		)
		if err := app.Save(users); err != nil {
			return err
		}

		days := core.NewBaseCollection("days")
		days.Fields.Add(
			&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, MaxSelect: 1, CascadeDelete: true},
			&core.TextField{Name: "date", Required: true, Pattern: `^\d{4}-\d{2}-\d{2}$`},
			&core.SelectField{Name: "flow", Values: []string{"spotting", "light", "medium", "heavy"}, MaxSelect: 1},
			&core.SelectField{Name: "symptoms", Values: symptoms, MaxSelect: len(symptoms)},
			&core.SelectField{Name: "moods", Values: moods, MaxSelect: len(moods)},
			&core.SelectField{Name: "sex", Values: []string{"protected", "unprotected"}, MaxSelect: 1},
			&core.BoolField{Name: "pill"},
			&core.NumberField{Name: "temperature", Min: types.Pointer(34.0), Max: types.Pointer(43.0)},
			&core.NumberField{Name: "weight", Min: types.Pointer(0.0), Max: types.Pointer(500.0)},
			&core.TextField{Name: "notes", Max: 2000},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		days.AddIndex("idx_days_user_date", true, "user, date", "")
		own := types.Pointer(`user = @request.auth.id`)
		days.ListRule, days.ViewRule, days.DeleteRule = own, own, own
		days.CreateRule = types.Pointer(`@request.auth.collectionName = "users" && @request.body.user = @request.auth.id`)
		days.UpdateRule = types.Pointer(`user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`)
		return app.Save(days)
	}, func(app core.App) error {
		days, err := app.FindCollectionByNameOrId("days")
		if err != nil {
			return err
		}
		if err := app.Delete(days); err != nil {
			return err
		}
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		for _, name := range []string{"cycle_length", "period_length", "luteal_length", "remind_period", "remind_fertile", "remind_pill"} {
			users.Fields.RemoveByName(name)
		}
		return app.Save(users)
	})
}
