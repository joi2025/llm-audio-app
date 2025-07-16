module.exports = {
  apps: [
    {
      name: "backend",
      cwd: "./backend",
      script: "python -m uvicorn main:app --reload --port 8000",
      interpreter: "none",
      watch: true,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm run dev -- --port 3001",
      watch: true,
      env: {
        NODE_ENV: "development",
        PORT: 3001
      }
    }
  ]
}
