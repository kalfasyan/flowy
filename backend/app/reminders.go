package app

import (
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"

	"github.com/kalfasyan/flowy/cycle"
	"github.com/kalfasyan/flowy/jobs"
	"github.com/kalfasyan/flowy/push"
)

// registerReminders sends each morning's period and fertile-window reminders
// to the people who turned them on in Settings.
func registerReminders(app core.App) {
	jobs.MustAdd(app, "reminders", "0 9 * * *", func(app core.App) error {
		return sendReminders(app, cycle.Of(time.Now()))
	})
}

func sendReminders(app core.App, now cycle.Day) error {
	users, err := app.FindRecordsByFilter("users", "remind_period = true || remind_fertile = true", "", 0, 0)
	if err != nil {
		return err
	}
	for _, u := range users {
		days, err := app.FindRecordsByFilter("days",
			"user = {:user} && (flow = 'light' || flow = 'medium' || flow = 'heavy')", "", 0, 0,
			dbx.Params{"user": u.Id})
		if err != nil {
			return err
		}
		var bleeding []cycle.Day
		for _, d := range days {
			if day, err := cycle.Parse(d.GetString("date")); err == nil {
				bleeding = append(bleeding, day)
			}
		}
		f, ok := cycle.Predict(bleeding, settingsOf(u), now)
		if !ok {
			continue
		}
		for _, msg := range reminders(f, now, u.GetBool("remind_period"), u.GetBool("remind_fertile")) {
			push.ToUser(app, u.Id, msg)
		}
	}
	return nil
}

func settingsOf(u *core.Record) cycle.Settings {
	s := cycle.Defaults
	if v := u.GetInt("cycle_length"); v > 0 {
		s.CycleLength = v
	}
	if v := u.GetInt("period_length"); v > 0 {
		s.PeriodLength = v
	}
	if v := u.GetInt("luteal_length"); v > 0 {
		s.LutealLength = v
	}
	return s
}

// reminders are the notifications due today.
func reminders(f cycle.Forecast, now cycle.Day, period, fertile bool) []push.Message {
	var out []push.Message
	if period && !f.InPeriod && f.NextStart-now == 2 {
		out = append(out, push.Message{
			Title: "Your period is coming",
			Body:  "It's expected in 2 days.",
			Tag:   "period",
		})
	}
	if fertile {
		for _, o := range f.Ovulations {
			if o-5 == now {
				out = append(out, push.Message{
					Title: "Your fertile window starts today",
					Body:  "Ovulation is expected in 5 days.",
					Tag:   "fertile",
				})
			}
		}
	}
	return out
}
