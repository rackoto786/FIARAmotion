import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    # Base de données PostgreSQL existante
    DB_USER = os.environ.get("DB_USER", "ceres")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "admin")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "5432")
    DB_NAME = os.environ.get("DB_NAME", "parc_roulant")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configuration Email (SMTP Gmail)
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = "rackoto786@gmail.com"
    MAIL_PASSWORD = "mhoo etou mfdn yzan"
    MAIL_DEFAULT_SENDER = "rackoto786@gmail.com"


