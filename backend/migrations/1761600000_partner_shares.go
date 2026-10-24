package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

// Sharing with a partner: someone makes a private link, and whoever has it
// sees a summary of their cycle at /#partner/<token> without signing in
// (backend/app/partner.go). Deleting the share turns the link off; a new
// share gets a new token. Only the person who shares sees their share.
func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		shares := core.NewBaseCollection("shares")
		shares.Fields.Add(
			&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, MaxSelect: 1, CascadeDelete: true},
			&core.TextField{Name: "token", Required: true, Min: 24, Max: 24, Pattern: `^[a-z0-9]+$`, AutogeneratePattern: `[a-z0-9]{24}`},
			// whether the partner also sees the day's moods and symptoms
			&core.BoolField{Name: "show_log"},
			&core.AutodateField{Name: "created", OnCreate: true},
		)
		shares.AddIndex("idx_shares_user", true, "user", "")
		shares.AddIndex("idx_shares_token", true, "token", "")
		own := types.Pointer(`user = @request.auth.id`)
		shares.ListRule, shares.ViewRule, shares.DeleteRule = own, own, own
		shares.CreateRule = types.Pointer(`@request.auth.collectionName = "users" && @request.body.user = @request.auth.id && @request.body.token:isset = false`)
		shares.UpdateRule = types.Pointer(`user = @request.auth.id && @request.body.user:isset = false && @request.body.token:isset = false`)
		return app.Save(shares)
	}, func(app core.App) error {
		shares, err := app.FindCollectionByNameOrId("shares")
		if err != nil {
			return err
		}
		return app.Delete(shares)
	})
}
