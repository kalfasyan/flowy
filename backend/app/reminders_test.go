package app

import (
	"testing"

	"github.com/kalfasyan/flowy/cycle"
)

func TestReminders(t *testing.T) {
	f := cycle.Forecast{NextStart: 100, Ovulations: []cycle.Day{86, 114}}
	cases := []struct {
		name            string
		now             cycle.Day
		period, fertile bool
		want            []string
	}{
		{"period in 2 days", 98, true, true, []string{"period"}},
		{"not when turned off", 98, false, true, nil},
		{"fertile window starts", 81, true, true, []string{"fertile"}},
		{"next cycle's fertile window", 109, false, true, []string{"fertile"}},
		{"nothing on other days", 90, true, true, nil},
	}
	for _, c := range cases {
		var got []string
		for _, m := range reminders(f, c.now, c.period, c.fertile) {
			got = append(got, m.Tag)
		}
		if len(got) != len(c.want) || (len(got) > 0 && got[0] != c.want[0]) {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}
