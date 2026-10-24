package app_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestSharesArePrivate(t *testing.T) {
	cases := []struct {
		name, as, method, url, body string
		status                      int
		content                     string
	}{
		{
			name: "people share their own cycle", as: "alice", method: http.MethodPost,
			url: "/api/collections/shares/records", body: `{"user":"{alice}"}`,
			status: http.StatusOK, content: `"token":"`,
		},
		{
			name: "nobody picks their own token", as: "alice", method: http.MethodPost,
			url: "/api/collections/shares/records", body: `{"user":"{alice}","token":"aaaaaaaaaaaaaaaaaaaaaaaa"}`,
			status: http.StatusBadRequest,
		},
		{
			name: "nobody shares someone else's", as: "bob", method: http.MethodPost,
			url: "/api/collections/shares/records", body: `{"user":"{alice}"}`,
			status: http.StatusBadRequest,
		},
		{
			name: "others don't see a share", as: "bob", method: http.MethodGet,
			url: "/api/collections/shares/records/{share}", status: http.StatusNotFound,
		},
		{
			name: "the token can't be changed", as: "alice", method: http.MethodPatch,
			url: "/api/collections/shares/records/{share}", body: `{"token":"aaaaaaaaaaaaaaaaaaaaaaaa"}`,
			status: http.StatusNotFound,
		},
		{
			name: "people choose what's shared", as: "alice", method: http.MethodPatch,
			url: "/api/collections/shares/records/{share}", body: `{"show_log":true}`,
			status: http.StatusOK, content: `"show_log":true`,
		},
	}

	for _, c := range cases {
		a := newApp(t)
		alice, aliceToken := addUser(t, a, "alice@example.com", "owner")
		bob, bobToken := addUser(t, a, "bob@example.com", "member")
		share := addShare(t, a, alice, false)
		if c.name == "people share their own cycle" {
			if err := a.Delete(share); err != nil {
				t.Fatal(err)
			}
		}

		headers := map[string]string{"Authorization": aliceToken}
		if c.as == "bob" {
			headers["Authorization"] = bobToken
		}
		fill := strings.NewReplacer("{alice}", alice.Id, "{bob}", bob.Id, "{share}", share.Id)
		s := tests.ApiScenario{
			Name:           c.name,
			Method:         c.method,
			URL:            fill.Replace(c.url),
			Body:           strings.NewReader(fill.Replace(c.body)),
			Headers:        headers,
			ExpectedStatus: c.status,
			TestAppFactory: func(testing.TB) *tests.TestApp { return a },
		}
		if c.content != "" {
			s.ExpectedContent = []string{c.content}
		}
		if c.status >= 400 {
			s.ExpectedContent = []string{`"status":`}
		}
		s.Test(t)
	}
}

func addShare(t *testing.T, a core.App, user *core.Record, showLog bool) *core.Record {
	t.Helper()
	shares, err := a.FindCollectionByNameOrId("shares")
	if err != nil {
		t.Fatal(err)
	}
	share := core.NewRecord(shares)
	share.Set("user", user.Id)
	share.Set("show_log", showLog)
	if err := a.Save(share); err != nil {
		t.Fatal(err)
	}
	return share
}

func addDay(t *testing.T, a core.App, user *core.Record, date string, fields map[string]any) {
	t.Helper()
	days, _ := a.FindCollectionByNameOrId("days")
	d := core.NewRecord(days)
	d.Set("user", user.Id)
	d.Set("date", date)
	for k, v := range fields {
		d.Set(k, v)
	}
	if err := a.Save(d); err != nil {
		t.Fatal(err)
	}
}

func TestPartnerView(t *testing.T) {
	now := time.Now()
	date := func(daysAgo int) string { return now.AddDate(0, 0, -daysAgo).Format(time.DateOnly) }
	cases := []struct {
		name            string
		showLog, delete bool
		token           string
		status          int
		want, notWant   []string
	}{
		{
			name: "a partner sees where the cycle is, but no log", status: http.StatusOK,
			want:    []string{`"phase":"menstrual"`, `"cycleDay":4`, `"inPeriod":true`, `"log":null`},
			notWant: []string{"private", "alice@", "calm"},
		},
		{
			name: "with show_log, also today's moods and symptoms", showLog: true, status: http.StatusOK,
			want: []string{`"moods":["calm"]`, `"label":"Dizzy"`}, notWant: []string{"private"},
		},
		{
			name: "a wrong token finds nothing", token: "abcdefghijklmnopqrstuvwx",
			status: http.StatusNotFound, want: []string{`"status":`},
		},
		{
			name: "a deleted share's link stops working", delete: true,
			status: http.StatusNotFound, want: []string{`"status":`},
		},
	}

	for _, c := range cases {
		a := newApp(t)
		alice, _ := addUser(t, a, "alice@example.com", "owner")
		for i := 3; i >= 1; i-- {
			addDay(t, a, alice, date(i), map[string]any{"flow": "medium"})
		}
		addDay(t, a, alice, date(0), map[string]any{
			"flow": "light", "moods": []string{"calm"}, "notes": "private",
			"custom_symptoms": []map[string]string{{"label": "Dizzy", "icon": "✨"}},
		})
		share := addShare(t, a, alice, c.showLog)
		token := share.GetString("token")
		if len(token) != 24 {
			t.Fatalf("token %q, want 24 characters", token)
		}
		if c.token != "" {
			token = c.token
		}
		if c.delete {
			if err := a.Delete(share); err != nil {
				t.Fatal(err)
			}
		}
		s := tests.ApiScenario{
			Name:               c.name,
			Method:             http.MethodGet,
			URL:                "/api/app/partner/" + token + "?today=" + date(0),
			ExpectedStatus:     c.status,
			ExpectedContent:    c.want,
			NotExpectedContent: c.notWant,
			TestAppFactory:     func(testing.TB) *tests.TestApp { return a },
		}
		s.Test(t)
	}
}

func TestCustomSymptomsAreChecked(t *testing.T) {
	a := newApp(t)
	alice, _ := addUser(t, a, "alice@example.com", "owner")
	days, _ := a.FindCollectionByNameOrId("days")
	for _, c := range []struct {
		value any
		ok    bool
	}{
		{[]map[string]string{{"label": "Dizzy", "icon": "😵‍💫"}}, true},
		{nil, true},
		{[]map[string]string{{"label": " ", "icon": "✨"}}, false},
		{[]map[string]string{{"label": strings.Repeat("a", 31), "icon": "✨"}}, false},
		{map[string]string{"label": "Dizzy"}, false},
	} {
		d := core.NewRecord(days)
		d.Set("user", alice.Id)
		d.Set("date", "2026-10-24")
		d.Set("notes", "x")
		d.Set("custom_symptoms", c.value)
		if err := a.Validate(d); (err == nil) != c.ok {
			t.Errorf("custom_symptoms %v: error %v, want ok=%v", c.value, err, c.ok)
		}
	}
}
