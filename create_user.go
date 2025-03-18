package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Println("Usage: go run create_user.go <email> <password>")
		os.Exit(1)
	}

	email := os.Args[1]
	password := os.Args[2]

	// Connect to database
	connStr := "postgres://postgres:postgres@localhost:5432/timetracker?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error connecting to database:", err)
	}
	defer db.Close()

	// Check if user already exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
	if err != nil {
		log.Fatal("Error checking user existence:", err)
	}

	if exists {
		log.Printf("User with email %s already exists. Updating password...", email)

		// Generate hashed password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Error hashing password:", err)
		}

		now := time.Now()

		// Update user
		_, err = db.Exec("UPDATE users SET password = $1, updated_at = $2 WHERE email = $3",
			string(hashedPassword), now, email)
		if err != nil {
			log.Fatal("Error updating user:", err)
		}

		fmt.Printf("Password updated for user %s\n", email)
	} else {
		// Generate hashed password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Error hashing password:", err)
		}

		now := time.Now()

		// Insert new user
		_, err = db.Exec("INSERT INTO users (email, password, created_at, updated_at) VALUES ($1, $2, $3, $4)",
			email, string(hashedPassword), now, now)
		if err != nil {
			log.Fatal("Error creating user:", err)
		}

		fmt.Printf("User %s created successfully\n", email)
	}
}
