module.exports = {
  apps: [
    {
      name: "golf-handicap-api",
      script: "dist/index.js",
      cwd: "/home/ubuntu/Golf_Handicap_Calc/backend",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: "4001",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
