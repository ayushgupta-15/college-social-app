package groups

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrNotFound  = errors.New("group not found")
	ErrForbidden = errors.New("only the group admin can perform this action")
	ErrIsAdmin   = errors.New("admin cannot leave — transfer ownership or delete the group first")
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ── shared scan ───────────────────────────────────────────────────────────────

const selectGroupCols = `
	SELECT g.id, g.name, g.description, g.subject,
	       g.admin_id, u.full_name,
	       g.avatar_url, g.is_private,
	       COUNT(gm.user_id) AS member_count,
	       g.created_at
	FROM groups g
	JOIN users u ON u.id = g.admin_id
	LEFT JOIN group_memberships gm ON gm.group_id = g.id`

func scanGroup(row interface{ Scan(...any) error }) (*Group, error) {
	var g Group
	var description, subject, avatarURL sql.NullString

	err := row.Scan(
		&g.ID, &g.Name, &description, &subject,
		&g.AdminID, &g.AdminName,
		&avatarURL, &g.IsPrivate,
		&g.MemberCount,
		&g.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if description.Valid {
		g.Description = &description.String
	}
	if subject.Valid {
		g.Subject = &subject.String
	}
	if avatarURL.Valid {
		g.AvatarURL = &avatarURL.String
	}
	return &g, nil
}

// ── List ──────────────────────────────────────────────────────────────────────

type ListGroupsParams struct {
	Subject *string // optional filter
	Search  *string // optional ILIKE on name
}

// List returns public groups with optional subject and name search filters.
func (r *Repository) List(ctx context.Context, p ListGroupsParams) ([]*Group, error) {
	query := selectGroupCols + ` WHERE g.is_private = FALSE`
	args := []any{}
	argN := 1

	if p.Subject != nil && *p.Subject != "" {
		query += fmt.Sprintf(` AND g.subject ILIKE $%d`, argN)
		args = append(args, "%"+*p.Subject+"%")
		argN++
	}
	if p.Search != nil && *p.Search != "" {
		query += fmt.Sprintf(` AND g.name ILIKE $%d`, argN)
		args = append(args, "%"+*p.Search+"%")
		argN++
	}

	query += ` GROUP BY g.id, u.full_name ORDER BY g.created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("List groups: %w", err)
	}
	defer rows.Close()

	var list []*Group
	for rows.Next() {
		g, err := scanGroup(rows)
		if err != nil {
			return nil, fmt.Errorf("List groups scan: %w", err)
		}
		list = append(list, g)
	}
	return list, rows.Err()
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func (r *Repository) GetByID(ctx context.Context, id string) (*Group, error) {
	query := selectGroupCols + `
		WHERE g.id = $1
		GROUP BY g.id, u.full_name`

	row := r.db.QueryRowContext(ctx, query, id)
	g, err := scanGroup(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return g, nil
}

// ── Create (transactional) ────────────────────────────────────────────────────

type CreateGroupParams struct {
	Name        string
	Description *string
	Subject     *string
	AdminID     string // internal user UUID
	AvatarURL   *string
	IsPrivate   bool
}

// Create inserts a group and immediately adds the creator as admin in a single transaction.
// If either insert fails, both are rolled back.
func (r *Repository) Create(ctx context.Context, p CreateGroupParams) (*Group, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// 1. Insert group
	var groupID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO groups (name, description, subject, admin_id, avatar_url, is_private)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, p.Name, p.Description, p.Subject, p.AdminID, p.AvatarURL, p.IsPrivate).Scan(&groupID)
	if err != nil {
		return nil, fmt.Errorf("insert group: %w", err)
	}

	// 2. Insert creator as admin in group_memberships
	_, err = tx.ExecContext(ctx, `
		INSERT INTO group_memberships (user_id, group_id, role)
		VALUES ($1, $2, 'admin')
	`, p.AdminID, groupID)
	if err != nil {
		return nil, fmt.Errorf("insert admin membership: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return r.GetByID(ctx, groupID)
}

// ── IsMember ──────────────────────────────────────────────────────────────────

// IsMember checks if a user belongs to a group.
func (r *Repository) IsMember(ctx context.Context, groupID, userID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
		groupID, userID,
	).Scan(&count)
	return count > 0, err
}

// GetRole returns the caller's role in the group, or "" if not a member.
func (r *Repository) GetRole(ctx context.Context, groupID, userID string) (MemberRole, error) {
	var role string
	err := r.db.QueryRowContext(ctx,
		`SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
		groupID, userID,
	).Scan(&role)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return MemberRole(role), err
}

// ── Join ──────────────────────────────────────────────────────────────────────

// Join adds a user to a group as a regular member.
func (r *Repository) Join(ctx context.Context, groupID, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO group_memberships (user_id, group_id, role)
		VALUES ($1, $2, 'member')
		ON CONFLICT DO NOTHING
	`, userID, groupID)
	if err != nil {
		return fmt.Errorf("Join: %w", err)
	}
	return nil
}

// ── Leave ─────────────────────────────────────────────────────────────────────

// Leave removes a user from a group.
// Returns ErrIsAdmin if the caller is the group admin (must delete/transfer first).
func (r *Repository) Leave(ctx context.Context, groupID, userID string) error {
	role, err := r.GetRole(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if strings.EqualFold(string(role), string(RoleAdmin)) {
		return ErrIsAdmin
	}

	_, err = r.db.ExecContext(ctx,
		`DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
		groupID, userID,
	)
	if err != nil {
		return fmt.Errorf("Leave: %w", err)
	}
	return nil
}
