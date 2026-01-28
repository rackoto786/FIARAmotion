from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_mail import Mail
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    # Autorise les routes avec ou sans slash final pour éviter les 308 (CORS préflight)
    app.url_map.strict_slashes = False

    # Configuration CORS plus détaillée
    # Configuration CORS plus permissive pour le développement
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "expose_headers": ["Content-Type", "X-Total-Count"],
            "supports_credentials": True,
            "max_age": 600
        }
    })

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    
    # Initialize scheduler for background tasks
    from .utils.scheduler import init_scheduler
    init_scheduler(app)

    # Import des modèles pour qu'Alembic voie les tables
    from . import models  # noqa: F401

    # Enregistrement des blueprints
    from .routes.auth import bp as auth_bp
    from .routes.vehicles import bp as vehicles_bp
    from .routes.drivers import bp as drivers_bp
    from .routes.fuel import bp as fuel_bp
    from .routes.maintenance import bp as maintenance_bp
    from .routes.missions import bp as missions_bp
    from .routes.planning import bp as planning_bp
    from .routes.dashboard import bp as dashboard_bp
    from .routes.reports import bp as reports_bp
    from .routes.notifications import bp as notifications_bp
    from .routes.compliance import bp as compliance_bp
    from .routes.assistant import bp as assistant_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(vehicles_bp, url_prefix="/api/vehicles")
    app.register_blueprint(drivers_bp, url_prefix="/api/drivers")
    app.register_blueprint(fuel_bp, url_prefix="/api/fuel")
    app.register_blueprint(maintenance_bp, url_prefix="/api/maintenance")
    app.register_blueprint(missions_bp, url_prefix="/api/missions")
    app.register_blueprint(planning_bp, url_prefix="/api/planning")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(compliance_bp, url_prefix="/api/compliance")
    app.register_blueprint(assistant_bp, url_prefix="/api/assistant")

    from .routes import users
    app.register_blueprint(users.bp, url_prefix="/api/users")

    from .routes import logs
    app.register_blueprint(logs.bp, url_prefix="/api/logs")

    @app.get("/")
    def index():
        return {
            "name": "Parc Roulant API",
            "version": "1.0.0",
            "docs": "/api/health",
            "status": "ok",
        }, 200

    @app.get("/api/health")
    def health_check():
        return {"status": "ok"}, 200

    return app


