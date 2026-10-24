package app

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/pocketbase/pocketbase/core"
)

// the longest label a symptom of your own can have (customLabelMax in web/src/lib/log.ts)
const customLabelMax = 30

type customSymptom struct {
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

// registerDayChecks makes sure the symptoms people add themselves are a short
// list of labels with an icon, since a JSON field takes anything.
func registerDayChecks(app core.App) {
	app.OnRecordValidate("days").BindFunc(func(e *core.RecordEvent) error {
		var list []customSymptom
		if err := e.Record.UnmarshalJSONField("custom_symptoms", &list); err != nil {
			return errors.New("custom_symptoms must be a list of {label, icon}")
		}
		if len(list) > 20 {
			return errors.New("at most 20 symptoms of your own per day")
		}
		for _, s := range list {
			if n := utf8.RuneCountInString(strings.TrimSpace(s.Label)); n == 0 || n > customLabelMax {
				return errors.New("each symptom needs a name of up to 30 characters")
			}
			if utf8.RuneCountInString(s.Icon) > 8 {
				return errors.New("a symptom's icon is one emoji")
			}
		}
		return e.Next()
	})
}
