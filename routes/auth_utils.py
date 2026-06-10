from functools import wraps
from flask import session, jsonify
from db import db
from models import Usuario

def get_current_user():
    user_id = session.get('user_id')
    return db.session.get(Usuario, user_id) if user_id else None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Por favor, inicie sesión para acceder.', 'code': 'UNAUTHORIZED'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'success': False, 'error': 'No autenticado.', 'code': 'UNAUTHORIZED'}), 401
            
            # Administrador siempre tiene acceso total
            if user.rol == 'Administrador':
                return f(*args, **kwargs)
                
            if user.rol not in roles:
                return jsonify({'success': False, 'error': f'Acceso denegado. Su rol de "{user.rol}" no tiene permiso para esta acción.', 'code': 'FORBIDDEN'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


