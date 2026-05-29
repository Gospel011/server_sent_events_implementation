declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: "development" | "production";
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    SQLITE_DB_PATH?: string;
  }
}
