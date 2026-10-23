// Package cycle predicts periods and fertile days from logged bleeding days,
// for reminders. web/src/lib/cycle.ts does the same for the app: keep the two
// in step.
package cycle

import (
	"math"
	"slices"
	"time"
)

// Day is a date as whole days since 1970-01-01.
type Day int

// Parse reads a YYYY-MM-DD date.
func Parse(s string) (Day, error) {
	t, err := time.Parse(time.DateOnly, s)
	if err != nil {
		return 0, err
	}
	return Day(t.Unix() / 86400), nil
}

// Of is the date of t in t's time zone.
func Of(t time.Time) Day {
	y, m, d := t.Date()
	return Day(time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Unix() / 86400)
}

// Settings are the person's typical lengths, used until periods are logged.
type Settings struct {
	CycleLength, PeriodLength, LutealLength int
}

// Defaults fill in settings someone hasn't set.
var Defaults = Settings{CycleLength: 28, PeriodLength: 5, LutealLength: 14}

// Period is a run of bleeding days; one day without bleeding doesn't end it.
type Period struct{ Start, End Day }

// Periods groups bleeding days into periods.
func Periods(bleeding []Day) []Period {
	days := slices.Clone(bleeding)
	slices.Sort(days)
	var out []Period
	for _, d := range slices.Compact(days) {
		if n := len(out); n > 0 && d-out[n-1].End <= 2 {
			out[n-1].End = d
		} else {
			out = append(out, Period{d, d})
		}
	}
	return out
}

// Forecast is what is expected next.
type Forecast struct {
	// NextStart is when the next period should start.
	NextStart Day
	// InPeriod is true while a period is going on.
	InPeriod bool
	// Late is how many days past NextStart there is no period yet.
	Late int
	// Ovulations are the expected ovulation days of this cycle and the next.
	Ovulations []Day
}

const learnFrom = 6

// Predict forecasts from the bleeding days; ok is false before any are logged.
func Predict(bleeding []Day, s Settings, now Day) (f Forecast, ok bool) {
	ps := Periods(bleeding)
	if len(ps) == 0 {
		return f, false
	}
	var cycles, lengths []int
	for i, p := range ps {
		if i+1 < len(ps) {
			if l := int(ps[i+1].Start - p.Start); l >= 15 && l <= 60 {
				cycles = append(cycles, l)
			}
		}
		// a period that could still get another day isn't finished
		if l := int(p.End-p.Start) + 1; p.End+2 < now && l <= 15 {
			lengths = append(lengths, l)
		}
	}
	cycleLength := average(cycles, s.CycleLength)
	periodLength := average(lengths, s.PeriodLength)

	last := ps[len(ps)-1]
	end := max(last.End, last.Start+Day(periodLength)-1)
	f.InPeriod = last.Start <= now && now <= end
	f.NextStart = last.Start + Day(cycleLength)
	if !f.InPeriod && now > f.NextStart {
		f.Late = int(now - f.NextStart)
	}
	// a late period is expected any day now
	following := max(f.NextStart, now) + Day(cycleLength)
	f.Ovulations = []Day{f.NextStart - Day(s.LutealLength), following - Day(s.LutealLength)}
	return f, true
}

// average of the last few values, rounded like Math.round in the web app
func average(xs []int, fallback int) int {
	if len(xs) == 0 {
		return fallback
	}
	xs = xs[max(0, len(xs)-learnFrom):]
	sum := 0
	for _, x := range xs {
		sum += x
	}
	return int(math.Floor(float64(sum)/float64(len(xs)) + 0.5))
}
