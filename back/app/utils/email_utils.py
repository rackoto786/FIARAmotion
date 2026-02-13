from flask_mail import Message
from flask import render_template_string, current_app
from threading import Thread
from .. import mail, db
from ..models import User
from datetime import datetime

def send_email_async(msg):
    """Send email asynchronously in a background thread to avoid blocking HTTP response."""
    def send_async_email(app, msg):
        with app.app_context():
            try:
                mail.send(msg)
            except Exception as e:
                print(f"Error sending async email: {e}")
    
    app = current_app._get_current_object()
    thread = Thread(target=send_async_email, args=(app, msg))
    thread.start()

def send_maintenance_alert(maintenance, vehicle):
    """Notify technicians and admins about a new maintenance request."""
    # Find active technicians and admins
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    
    if not recipients:
        return

    subject = f"Nouvelle demande d'intervention : {vehicle.immatriculation}"
    
    html_content = f"""
    <h3>Nouvelle demande d'intervention</h3>
    <p>Une nouvelle demande a été soumise par <b>{maintenance.demandeur.name}</b>.</p>
    <ul>
        <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
        <li><b>Type :</b> {maintenance.type}</li>
        <li><b>Description :</b> {maintenance.description}</li>
        <li><b>Date prévue :</b> {maintenance.date_prevue}</li>
    </ul>
    <p>Veuillez vous connecter à l'application pour valider ou rejeter cette demande.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_status_update_notification(maintenance, vehicle):
    """Notify the requester about the status change (accepted/rejected)."""
    recipient = maintenance.demandeur.profile_email
    if not recipient:
        return

    status_label = "Acceptée" if maintenance.statut == 'accepte' else "Rejetée"
    subject = f"Votre demande d'intervention pour {vehicle.immatriculation} a été {status_label}"
    
    color = "green" if maintenance.statut == 'accepte' else "red"
    
    html_content = f"""
    <h3>Mise à jour de votre demande d'intervention</h3>
    <p>Votre demande pour le véhicule <b>{vehicle.immatriculation}</b> a été <b style="color: {color};">{status_label.lower()}</b>.</p>
    <p><b>Détails :</b></p>
    <ul>
        <li><b>Type :</b> {maintenance.type}</li>
        <li><b>Description :</b> {maintenance.description}</li>
    </ul>
    <p>Merci de consulter l'application pour plus d'informations.</p>
    """
    
    msg = Message(subject, recipients=[recipient])
    msg.html = html_content
    
    send_email_async(msg)

def send_mileage_limit_alert(vehicle, alert_type, current_km, threshold_km):
    """Notify admins/technicians when a vehicle exceeds its mileage threshold for maintenance."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    type_label = "vidange" if alert_type == 'vidange' else "changement de filtre"
    subject = f"ALERTE MAINTENANCE : {vehicle.immatriculation} ({type_label})"
    
    html_content = f"""
    <h3 style="color: #d32f2f;">Alerte de Maintenance Automatique</h3>
    <p>Le véhicule <b>{vehicle.immatriculation}</b> ({vehicle.marque} {vehicle.modele}) a atteint le seuil critique pour : <b>{type_label.upper()}</b>.</p>
    <ul>
        <li><b>Kilométrage actuel :</b> {current_km} km</li>
        <li><b>Dernière intervention :</b> {vehicle.last_vidange_km if alert_type == 'vidange' else vehicle.last_filtre_km} km</li>
        <li><b>Seuil d'alerte :</b> {threshold_km} km</li>
    </ul>
    <p>Une intervention est nécessaire immédiatement.</p>
    <p>Veuillez planifier une maintenance depuis l'application.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)
    
    # Also create an in-app notification
    from .notification_utils import create_notification
    create_notification(
        title=f"Alerte Maintenance: {vehicle.immatriculation}",
        message=f"Le véhicule {vehicle.immatriculation} a atteint le seuil de {type_label}.",
        type="warning",
        target_role="technician",
        link="/vehicles"
    )
    
    return True

def send_planning_creation_alert(planning, vehicle):
    """Notify admins/technicians about a new planning reservation."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    subject = f"Nouvelle réservation Planning : {vehicle.immatriculation}"
    
    creator_name = planning.created_by.name if planning.created_by else "Un utilisateur"

    html_content = f"""
    <h3>Nouvelle Réservation Planning</h3>
    <p>Une nouvelle réservation a été créée par <b>{creator_name}</b>.</p>
    <ul>
        <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
        <li><b>Type :</b> {planning.type}</li>
        <li><b>Date Début :</b> {planning.date_debut}</li>
        <li><b>Date Fin :</b> {planning.date_fin}</li>
        <li><b>Description :</b> {planning.description}</li>
    </ul>
    <p>Connectez-vous pour valider ou rejeter cette demande.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_planning_status_notification(planning, vehicle):
    """Notify the creator about the planning status change."""
    if not planning.created_by or not planning.created_by.profile_email:
        return

    recipient = planning.created_by.profile_email
    status_label = "Acceptée" if planning.status == 'acceptee' else "Rejetée" if planning.status == 'rejetee' else planning.status
    color = "green" if planning.status == 'acceptee' else "red" if planning.status == 'rejetee' else "gray"
    
    subject = f"Votre réservation pour {vehicle.immatriculation} a été {status_label}"
    
    html_content = f"""
    <h3>Mise à jour de votre réservation</h3>
    <p>Votre réservation (Type: {planning.type}) pour le véhicule <b>{vehicle.immatriculation}</b> a été <b style="color: {color};">{status_label}</b>.</p>
    <p><b>Détails :</b></p>
    <ul>
        <li><b>Dates :</b> {planning.date_debut} au {planning.date_fin}</li>
        <li><b>Description :</b> {planning.description}</li>
    </ul>
    """
    
    msg = Message(subject, recipients=[recipient])
    msg.html = html_content
    
    send_email_async(msg)

def send_mission_creation_alert(mission, vehicle):
    """Notify admins/technicians about a new mission."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    subject = f"Nouvelle Mission Créée : {mission.reference}"
    
    html_content = f"""
    <h3>Nouvelle Mission</h3>
    <p>Une nouvelle mission a été créée.</p>
    <ul>
        <li><b>Référence :</b> {mission.reference}</li>
        <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
        <li><b>Missionnaire :</b> {mission.missionnaire or 'N/A'}</li>
        <li><b>Trajet :</b> {mission.lieu_depart} -> {mission.lieu_destination}</li>
        <li><b>Dates :</b> {mission.date_debut} {f'au {mission.date_fin}' if mission.date_fin else ''}</li>
    </ul>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_mission_status_notification(mission, vehicle):
    """Notify admins/technicians about a mission status update."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    subject = f"Mise à jour Mission : {mission.reference} ({mission.state.upper()})"
    
    html_content = f"""
    <h3>Mise à jour de Mission</h3>
    <p>La mission <b>{mission.reference}</b> est maintenant <b>{mission.state.upper()}</b>.</p>
    <ul>
        <li><b>Véhicule :</b> {vehicle.immatriculation}</li>
        <li><b>Missionnaire :</b> {mission.missionnaire or 'N/A'}</li>
    </ul>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_fuel_creation_alert(fuel_entry, vehicle):
    """Notify admins and technicians about a new fuel entry."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    subject = f"Nouvelle entrée Carburant : {vehicle.immatriculation}"
    
    driver_name = fuel_entry.driver.nom if fuel_entry.driver else "Inconnu"

    html_content = f"""
    <h3>Nouveau plein de carburant enregistré</h3>
    <p>Un nouveau plein a été enregistré par <b>{driver_name}</b>.</p>
    <ul>
        <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
        <li><b>Quantité :</b> {fuel_entry.quantite_achetee} L</li>
        <li><b>Montant :</b> {fuel_entry.total_achete}</li>
        <li><b>Kilométrage :</b> {fuel_entry.actuel_km} km</li>
    </ul>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_reminder_alert(request_type, request_obj, vehicle):
    """Send a reminder email for a pending request."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    subject = f"RAPPEL : Demande {request_type} en attente - {vehicle.immatriculation}"
    
    # Generic mapping based on request type
    details = ""
    if request_type == "Mission":
        details = f"<li><b>Référence :</b> {request_obj.reference}</li><li><b>Trajet :</b> {request_obj.lieu_depart} -> {request_obj.lieu_destination}</li>"
        date_val = request_obj.date_debut
    elif request_type == "Planning":
        details = f"<li><b>Type :</b> {request_obj.type}</li><li><b>Description :</b> {request_obj.description}</li>"
        date_val = request_obj.date_debut
    elif request_type == "Maintenance":
        details = f"<li><b>Type :</b> {request_obj.type}</li><li><b>Description :</b> {request_obj.description}</li>"
        date_val = request_obj.date_prevue
    else:
        date_val = "N/A"

    html_content = f"""
    <h3 style="color: #e67e22;">Rappel : Demande toujours en attente</h3>
    <p>La demande de type <b>{request_type}</b> pour le véhicule <b>{vehicle.immatriculation}</b> nécessite votre intervention.</p>
    <ul>
        {details}
        <li><b>Date prévue :</b> {date_val}</li>
    </ul>
    <p>Cette demande est prévue pour demain. Veuillez la traiter dès que possible dans l'application.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)

def send_document_expiry_alert(compliance, vehicle):
    """Notify admins/technicians about a document expiring in 5 days."""
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    if not recipients:
        return

    days_remaining = (compliance.date_expiration - datetime.now().date()).days
    subject = f"ALERTE ÉCHÉANCE : {compliance.type.upper()} - {vehicle.immatriculation} (Expire dans {days_remaining} jours)"
    
    type_labels = {
        'assurance': 'Assurance',
        'vignette': 'Vignette',
        'visite_technique': 'Visite Technique',
        'carte_rose': 'Carte Rose'
    }
    type_label = type_labels.get(compliance.type, compliance.type)
    
    html_content = f"""
    <h3 style="color: #f39c12;">⚠️ Alerte d'Échéance Imminente</h3>
    <p>Le document <b>{type_label}</b> du véhicule <b>{vehicle.immatriculation}</b> ({vehicle.marque} {vehicle.modele}) expire dans <b style="color: #e74c3c;">{days_remaining} jours</b>.</p>
    <ul>
        <li><b>Type de document :</b> {type_label}</li>
        <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
        <li><b>Numéro de document :</b> {compliance.numero_document or 'N/A'}</li>
        <li><b>Date d'expiration :</b> {compliance.date_expiration.strftime('%d/%m/%Y')}</li>
        <li><b>Prestataire :</b> {compliance.prestataire or 'N/A'}</li>
    </ul>
    <p style="color: #e74c3c;"><b>Action requise :</b> Veuillez planifier le renouvellement de ce document avant son expiration.</p>
    <p>Connectez-vous à l'application pour gérer cette échéance.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    send_email_async(msg)
    
    # Also create an in-app notification
    from .notification_utils import create_notification
    create_notification(
        title=f"Échéance proche: {type_label}",
        message=f"Le {type_label} du véhicule {vehicle.immatriculation} expire le {compliance.date_expiration.strftime('%d/%m/%Y')}.",
        type="warning",
        target_role="admin",
        link="/compliance"
    )
    
    return True

def send_abnormal_fuel_alert(fuel_entry, vehicle, driver_name):
    """Notify admins and technicians about an abnormal fuel transaction."""
    print("DEBUG: Inside send_abnormal_fuel_alert")
    recipients = [u.profile_email for u in User.query.filter(User.role.in_(['admin', 'technician'])).all() if u.profile_email]
    print(f"DEBUG: Found {len(recipients)} recipients: {recipients}")
    if not recipients:
        print("DEBUG: No recipients found, exiting.")
        return

    subject = f"⚠️ ALERTE : Consommation de carburant anormale - {vehicle.immatriculation}"
    print(f"DEBUG: Preparing email with subject: {subject}")
    
    html_content = f"""
    <h3 style="color: #e74c3c;">🚨 Alerte de Consommation Anormale Detectée</h3>
    <p>Une transaction de carburant suspecte a été enregistrée pour le véhicule <b>{vehicle.immatriculation}</b>.</p>
    <div style="background-color: #fcebea; padding: 15px; border-radius: 8px; border: 1px solid #e74c3c;">
        <ul>
            <li><b>Conducteur :</b> {driver_name}</li>
            <li><b>Véhicule :</b> {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})</li>
            <li><b>Quantité Achetée (QTEacheter) :</b> <span style="color: #e74c3c; font-weight: bold;">{fuel_entry.quantite_achetee:.2f} L</span></li>
            <li><b>Quantité Rechargée (QTErecharger) :</b> {fuel_entry.quantite_rechargee:.2f} L</li>
            <li><b>Capacité du Réservoir :</b> {vehicle.capacite_reservoir} L</li>
            <li><b>Numéro Ticket :</b> {fuel_entry.numero_ticket or 'N/A'}</li>
            <li><b>Date :</b> {fuel_entry.date.strftime('%d/%m/%Y')}</li>
        </ul>
    </div>
    <p><b>Observation :</b> La quantité rechargée dépasse la capacité nominale du réservoir.</p>
    <p style="font-weight: bold;">Une vérification et une explication du conducteur sont nécessaires.</p>
    <p>Veuillez consulter les détails complets dans l'application.</p>
    """
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    print("DEBUG: Calling send_email_async")
    send_email_async(msg)
    
    # Also create an in-app notification
    print("DEBUG: Creating in-app notification")
    from .notification_utils import create_notification
    create_notification(
        title=f"Anomalie Carburant: {vehicle.immatriculation}",
        message=f"Quantité ({fuel_entry.quantite_rechargee}L) supérieure à la capacité ({vehicle.capacite_reservoir}L).",
        type="error",
        target_role="admin",
        link="/fuel"
    )
    
    print("DEBUG: send_abnormal_fuel_alert completed")
    return True
