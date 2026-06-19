package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	FirebaseCredentialFile string
	CloudinaryURL          string
	Env                    string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	return &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            mustGetEnv("DATABASE_URL"),
		FirebaseCredentialFile: mustGetEnv("FIREBASE_CREDENTIAL_FILE"),
		CloudinaryURL:          mustGetEnv("CLOUDINARY_URL"),
		Env:                    getEnv("ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("FATAL: environment variable %s is required but not set", key)
	}
	return v
}
