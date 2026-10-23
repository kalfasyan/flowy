package app_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestDaysArePrivate(t *testing.T) {
	cases := []struct {
		name, as, method, url, body string
		status                      int
		content                     string
	}{
		{
			name: "people log their own days", as: "alice", method: http.MethodPost,
			url: "/api/collections/days/records", body: `{"user":"{alice}","date":"2026-10-24","flow":"medium"}`,
			status: http.StatusOK, content: `"flow":"medium"`,
		},
		{
			name: "nobody logs days for someone else", as: "bob", method: http.MethodPost,
			url: "/api/collections/days/records", body: `{"user":"{alice}","date":"2026-10-24"}`,
			status: http.StatusBadRequest,
		},
		{
			name: "one log per day", as: "alice", method: http.MethodPost,
			url: "/api/collections/days/records", body: `{"user":"{alice}","date":"2026-10-23"}`,
			status: http.StatusBadRequest,
		},
		{
			name: "people see their own days", as: "alice", method: http.MethodGet,
			url: "/api/collections/days/records", status: http.StatusOK, content: `"totalItems":1`,
		},
		{
			name: "others don't see them", as: "bob", method: http.MethodGet,
			url: "/api/collections/days/records", status: http.StatusOK, content: `"totalItems":0`,
		},
		{
			name: "or open them", as: "bob", method: http.MethodGet,
			url: "/api/collections/days/records/{day}", status: http.StatusNotFound,
		},
		{
			name: "a day can't be given away", as: "alice", method: http.MethodPatch,
			url: "/api/collections/days/records/{day}", body: `{"user":"{bob}"}`,
			status: http.StatusNotFound,
		},
		{
			name: "people delete their own days", as: "alice", method: http.MethodDelete,
			url: "/api/collections/days/records/{day}", status: http.StatusNoContent,
		},
	}

	for _, c := range cases {
		a := newApp(t)
		alice, aliceToken := addUser(t, a, "alice@example.com", "owner")
		bob, bobToken := addUser(t, a, "bob@example.com", "member")
		days, _ := a.FindCollectionByNameOrId("days")
		day := core.NewRecord(days)
		day.Set("user", alice.Id)
		day.Set("date", "2026-10-23")
		day.Set("flow", "light")
		if err := a.Save(day); err != nil {
			t.Fatal(err)
		}

		headers := map[string]string{"Authorization": aliceToken}
		if c.as == "bob" {
			headers["Authorization"] = bobToken
		}
		fill := strings.NewReplacer("{alice}", alice.Id, "{bob}", bob.Id, "{day}", day.Id)
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
