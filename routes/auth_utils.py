from functools import wraps
from flask import session, redirect, url_for, flash
from models import Usuario

def get_current_user():
    user_id = session.get('user_id')
    return Usuario.query.get(user_id) if user_id else None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Por favor, inicie sesión para acceder.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return redirect(url_for('auth.login'))
            # Administrador has access to everything
            if user.rol != 'Administrador' and user.rol not in roles:
                flash(f'Acceso denegado. Requiere rol: {", ".join(roles)}', 'error')
                return redirect(url_for('index'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator
