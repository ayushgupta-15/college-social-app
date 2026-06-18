package auth

import (
	"context"
	"errors"
	"fmt"

	firebasepkg "github.com/ayushgupta-15/college-social-app/backend/pkg/firebase"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
)

type Service struct {
	firebase *firebasepkg.Client
	userRepo *users.Repository
}

func NewService(firebase *firebasepkg.Client, userRepo *users.Repository) *Service {
	return &Service{
		firebase: firebase,
		userRepo: userRepo,
	}
}

// SignupRequest holds the body payload for POST /auth/signup.
type SignupRequest struct {
	FirebaseToken string `json:"firebase_token" binding:"required"`
	Username      string `json:"username"       binding:"required,min=3,max=50"`
	FullName      string `json:"full_name"      binding:"required"`
}

// LoginRequest holds the body payload for POST /auth/login.
type LoginRequest struct {
	FirebaseToken string `json:"firebase_token" binding:"required"`
}

// Signup verifies the Firebase ID token, checks uniqueness, and creates the user.
func (s *Service) Signup(ctx context.Context, req SignupRequest) (*users.User, error) {
	// 1. Verify token with Firebase
	token, err := s.firebase.VerifyIDToken(ctx, req.FirebaseToken)
	if err != nil {
		return nil, fmt.Errorf("invalid firebase token: %w", err)
	}

	// 2. Prevent duplicate Firebase UID
	existing, err := s.userRepo.GetByFirebaseUID(ctx, token.UID)
	if err != nil && !errors.Is(err, users.ErrNotFound) {
		return nil, fmt.Errorf("checking existing user: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user with this Firebase account already exists")
	}

	// 3. Check username uniqueness
	taken, err := s.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("checking username: %w", err)
	}
	if taken {
		return nil, errors.New("username is already taken")
	}

	// 4. Extract email from token claims
	email, _ := token.Claims["email"].(string)

	// 5. Insert user
	user, err := s.userRepo.Create(ctx, users.CreateUserParams{
		FirebaseUID: token.UID,
		Email:       email,
		Username:    req.Username,
		FullName:    req.FullName,
	})
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	return user, nil
}

// Login verifies the Firebase ID token and returns the existing user.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*users.User, error) {
	// 1. Verify token
	token, err := s.firebase.VerifyIDToken(ctx, req.FirebaseToken)
	if err != nil {
		return nil, fmt.Errorf("invalid firebase token: %w", err)
	}

	// 2. Fetch user
	user, err := s.userRepo.GetByFirebaseUID(ctx, token.UID)
	if errors.Is(err, users.ErrNotFound) {
		return nil, errors.New("no account found — please sign up first")
	}
	if err != nil {
		return nil, fmt.Errorf("fetching user: %w", err)
	}

	return user, nil
}
