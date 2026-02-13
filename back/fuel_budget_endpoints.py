"""
New endpoints for fuel budget management
"""

# Append to fuel.py after line 763

@bp.get("/budgets")
def get_budgets():
    """Get monthly budgets for a specific year and optional vehicle"""
    year = request.args.get('year', type=int) or datetime.now().year
    vehicle_id = request.args.get('vehicle_id')
    
    query = FuelMonthlyBudget.query.filter_by(year=year)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    
    budgets = query.all()
    
    return jsonify([{
        'id': b.id,
        'vehicle_id': b.vehicle_id,
        'year': b.year,
        'month': b.month,
        'forecast_amount': b.forecast_amount,
        'alert_sent': b.alert_sent
    } for b in budgets]), 200


@bp.post("/budgets")
def create_or_update_budget():
    """Create or update a monthly budget forecast"""
    try:
        data = request.json
        vehicle_id = data.get('vehicle_id')
        year = data.get('year')
        month = data.get('month')
        forecast_amount = data.get('forecast_amount')
        
        if not all([vehicle_id, year, month, forecast_amount]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if month < 1 or month > 12:
            return jsonify({'error': 'Month must be between 1 and 12'}), 400
        
        # Check if budget already exists
        existing = FuelMonthlyBudget.query.filter_by(
            vehicle_id=vehicle_id,
            year=year,
            month=month
        ).first()
        
        if existing:
            # Update existing
            existing.forecast_amount = forecast_amount
            existing.updated_at = datetime.utcnow()
            existing.alert_sent = False  # Reset alert when budget is updated
            db.session.commit()
            budget = existing
        else:
            # Create new
            budget = FuelMonthlyBudget(
                id=str(uuid.uuid4()),
                vehicle_id=vehicle_id,
                year=year,
                month=month,
                forecast_amount=forecast_amount
            )
            db.session.add(budget)
            db.session.commit()
        
        # Check for overrun after creating/updating
        check_budget_overrun(vehicle_id, year, month)
        
        return jsonify({
            'id': budget.id,
            'vehicle_id': budget.vehicle_id,
            'year': budget.year,
            'month': budget.month,
            'forecast_amount': budget.forecast_amount
        }), 201
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.get("/year-end-balance-with-budgets")
def get_year_end_balance_with_budgets():
    """
    Enhanced version with budget tracking.
    Returns monthly forecast, consumed, and balance for each vehicle.
    """
    try:
        year = request.args.get('year', type=int) or datetime.now().year
        
        vehicles = Vehicle.query.all()
        vehicles_data = []
        total_overruns = 0
        
        for vehicle in vehicles:
            # Get fuel entries for this year
            entries = FuelEntry.query.filter(
                db.extract('year', FuelEntry.date) == year,
                FuelEntry.vehicule_id == vehicle.id
            ).order_by(FuelEntry.date.asc()).all()
            
            # Get budgets for this year
            budgets = FuelMonthlyBudget.query.filter_by(
                vehicle_id=vehicle.id,
                year=year
            ).all()
            budget_map = {b.month: b for b in budgets}
            
            # Calculate monthly data
            monthly_data = {}
            for m in range(1, 13):
                monthly_data[m] = {
                    'month': m,
                    'forecast': 0,
                    'consumed': 0,
                    'balance': 0,
                    'date': None,
                    'exceeded': False
                }
            
            # Calculate consumed amounts per month
            for entry in entries:
                month = entry.date.month
                monthly_data[month]['consumed'] += (entry.total_achete or 0)
                
                # Update balance with last entry of month
                if monthly_data[month]['date'] is None or entry.date > monthly_data[month]['date']:
                    monthly_data[month]['balance'] = entry.nouveau_solde or 0
                    monthly_data[month]['date'] = entry.date
            
            # Add forecast data
            vehicle_overruns = 0
            for month, budget in budget_map.items():
                monthly_data[month]['forecast'] = budget.forecast_amount
                
                # Check if exceeded
                if budget.forecast_amount > 0 and monthly_data[month]['consumed'] > budget.forecast_amount:
                    monthly_data[month]['exceeded'] = True
                    vehicle_overruns += 1
            
            total_overruns += vehicle_overruns
            
            # Format for response
            monthly_list = [
                {
                    'month': m['month'],
                    'forecast': m['forecast'],
                    'consumed': m['consumed'],
                    'balance': m['balance'],
                    'date': m['date'].isoformat() if m['date'] else None,
                    'exceeded': m['exceeded']
                }
                for m in sorted(monthly_data.values(), key=lambda x: x['month'])
            ]
            
            # Year-end balance logic (same as before)
            year_end_balance = 0
            if monthly_data[12]['date']:
                year_end_balance = monthly_data[12]['balance']
            else:
                for m_data in reversed(sorted(monthly_data.values(), key=lambda x: x['month'])):
                    if m_data['date']:
                        year_end_balance = m_data['balance']
                        break
            
            vehicles_data.append({
                'vehicle_id': vehicle.id,
                'immatriculation': vehicle.immatriculation,
                'marque': vehicle.marque,
                'monthly_data': monthly_list,
                'last_balance': year_end_balance,
                'overrun_months': vehicle_overruns
            })
        
        # Calculate grand totals
        grand_total_forecast = sum(
            sum(m['forecast'] for m in v['monthly_data'])
            for v in vehicles_data
        )
        grand_total_consumed = sum(
            sum(m['consumed'] for m in v['monthly_data'])
            for v in vehicles_data
        )
        grand_total_balance = sum(v['last_balance'] for v in vehicles_data)
        
        return jsonify({
            'year': year,
            'vehicles_data': vehicles_data,
            'grand_total_forecast': grand_total_forecast,
            'grand_total_consumed': grand_total_consumed,
            'grand_total_balance': grand_total_balance,
            'total_overruns': total_overruns
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.get("/budget-overruns")
def get_budget_overruns():
    """Get list of vehicles that exceeded their budget"""
    try:
        year = request.args.get('year', type=int) or datetime.now().year
        
        overruns = []
        
        budgets = FuelMonthlyBudget.query.filter_by(year=year).all()
        
        for budget in budgets:
            # Calculate consumed for this vehicle/month
            consumed = db.session.query(
                db.func.sum(FuelEntry.total_achete)
            ).filter(
                FuelEntry.vehicule_id == budget.vehicle_id,
                db.extract('year', FuelEntry.date) == year,
                db.extract('month', FuelEntry.date) == budget.month
            ).scalar() or 0
            
            if consumed > budget.forecast_amount:
                vehicle = Vehicle.query.get(budget.vehicle_id)
                overruns.append({
                    'vehicle_id': budget.vehicle_id,
                    'immatriculation': vehicle.immatriculation if vehicle else 'Unknown',
                    'marque': vehicle.marque if vehicle else '',
                    'month': budget.month,
                    'forecast': budget.forecast_amount,
                    'consumed': consumed,
                    'overrun_amount': consumed - budget.forecast_amount,
                    'overrun_percent': ((consumed / budget.forecast_amount) - 1) * 100 if budget.forecast_amount > 0 else 0
                })
        
        return jsonify(overruns), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def check_budget_overrun(vehicle_id, year, month):
    """Check if consumption exceeded forecast and send alert if needed"""
    try:
        budget = FuelMonthlyBudget.query.filter_by(
            vehicle_id=vehicle_id,
            year=year,
            month=month
        ).first()
        
        if not budget or budget.alert_sent:
            return  # No budget or alert already sent
        
        # Calculate consumed
        consumed = db.session.query(
            db.func.sum(FuelEntry.total_achete)
        ).filter(
            FuelEntry.vehicule_id == vehicle_id,
            db.extract('year', FuelEntry.date) == year,
            db.extract('month', FuelEntry.date) == month
        ).scalar() or 0
        
        if consumed > budget.forecast_amount:
            # Send alert
            vehicle = Vehicle.query.get(vehicle_id)
            if vehicle:
                send_budget_overrun_alert(vehicle, year, month, budget.forecast_amount, consumed)
                
                # Mark alert as sent
                budget.alert_sent = True
                db.session.commit()
    
    except Exception as e:
        print(f"Error checking budget overrun: {e}")
        traceback.print_exc()


def send_budget_overrun_alert(vehicle, year, month, forecast, consumed):
    """Send email alert when budget is exceeded"""
    from ..models import User
    
    recipients = [u.profile_email for u in User.query.filter(
        User.role.in_(['admin', 'technician'])
    ).all() if u.profile_email]
    
    if not recipients:
        return
    
    month_names = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    month_name = month_names[month]
    
    overrun_amount = consumed - forecast
    overrun_percent = ((consumed / forecast) - 1) * 100 if forecast > 0 else 0
    
    subject = f"⚠️ BUDGET DÉPASSÉ : {vehicle.immatriculation} - {month_name} {year}"
    
    html_content = f"""
    <h3 style="color: #e74c3c;">⚠️ Dépassement Budgétaire Détecté</h3>
    <p>Le véhicule <b>{vehicle.immatriculation}</b> ({vehicle.marque} {vehicle.modele}) a dépassé son budget carburant.</p>
    <div style="background-color: #fcebea; padding: 15px; border-radius: 8px; border: 1px solid #e74c3c; margin: 15px 0;">
        <ul>
            <li><b>Mois :</b> {month_name} {year}</li>
            <li><b>Budget prévu :</b> {forecast:,.0f} Ar</li>
            <li><b>Montant consommé :</b> <span style="color: #e74c3c; font-weight: bold;">{consumed:,.0f} Ar</span></li>
            <li><b>Dépassement :</b> <span style="color: #e74c3c; font-weight: bold;">{overrun_amount:,.0f} Ar ({overrun_percent:.1f}%)</span></li>
        </ul>
    </div>
    <p><b>Action requise :</b> Veuillez vérifier la consommation de carburant et prendre les mesures appropriées.</p>
    <p>Connectez-vous à l'application pour plus de détails.</p>
    """
    
    from flask_mail import Message
    from .. import mail
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    from ..utils.email_utils import send_email_async
    send_email_async(msg)
    
    # Also create in-app notification
    from ..utils.notification_utils import create_notification
    create_notification(
        title=f"Budget dépassé: {vehicle.immatriculation}",
        message=f"Budget {month_name}: {consumed:,.0f} Ar / {forecast:,.0f} Ar (+{overrun_percent:.1f}%)",
        type="error",
        target_role="admin",
        link="/fuel/year-end-stats"
    )
