# Form Builder Backend

A backend service for managing and building forms, powered by Node.js, Express, Prisma, and PostgreSQL.

## Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
   - [Development Setup](#development-setup)
   - [Production Setup](#production-setup)
4. [Environment Variables](#environment-variables)
5. [API Endpoints](#api-endpoints)
6. [License](#license)

---

## Features

- **Form Management**: Create, update, delete, and retrieve forms with fields.
- **Authentication**: Secure endpoints with JWT-based authentication.
- **Role-based Authorization**: Different permissions for `ADMIN` and `USER`.
- **Persistent Storage**: Uses PostgreSQL with Prisma ORM.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [PostgreSQL](https://www.postgresql.org/) (if running without Docker)

---

## Getting Started

### Development Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-repo/form-builder-backend.git
   cd form-builder-backend
   ```

docker-compose -f docker-compose.dev.yaml build --no-cache 2. **Install Dependencies**:

```bash
bun install
```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory with the following content:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/form_builder
   JWT_SECRET=your-secret-key
   ```

4. **Run the Database with Docker**:

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

5. **Run Migrations**:
   Apply database migrations using Prisma:

   ```bash
   bun prisma migrate dev
   ```

   bun prisma generate  
   prisma db push

   <!-- docker exec -it form-builder-backend bun prisma migrate deploy -->

   ```bash
   docker exec -it form-builder-backend npx prisma migrate dev
   ```

6. **Start the Development Server**:

   ```bash
   npm run dev
   ```

   Access the API at http://localhost:3000

### Production Setup

1. **Build the Production Docker Image**:

   ```bash
   docker build -t form-builder-backend:1.0.0 -f Dockerfile.prod .
   ```

2. **Set Up Environment Variables**:
   Create a `.env` file in the root directory with the following content:

   ```env
   DATABASE_URL=postgresql://user:password@db:5432/form_builder
   JWT_SECRET=your-production-secret-key
   ```

3. **Run the Application with Docker Compose**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Run Prisma Migrations**:
   Apply the migrations to the production database:

   ```bash
   docker exec -it form-builder-production npx prisma migrate deploy
   ```

   Access the API at http://localhost:3000

### Environment Variables

Here are the environment variables used in the application:

- `DATABASE_URL`: The PostgreSQL connection string (e.g., `postgresql://user:password@host:port/database`)
- `JWT_SECRET`: Secret key for signing JWT tokens

Create a `.env` file in the root directory with these values for both development and production.

<!-- bun prisma generate  -->
<!-- bun prisma db push -->
