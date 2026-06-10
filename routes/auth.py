from flask import Blueprint, request, jsonify, session
from db import db
from models import Usuario

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    if 'user_id' in session:
        user = db.session.get(Usuario, session['user_id'])
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'nombre': user.nombre,
                    'email': user.email,
                    'rol': user.rol
                }
            })

    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        email = request.form.get('email')
        password = request.form.get('password')

    user = db.session.query(Usuario).filter_by(email=email).first()
    
    if user and user.verificar_password(password):
        session['user_id'] = user.id
        session['rol'] = user.rol
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'nombre': user.nombre,
                'email': user.email,
                'rol': user.rol
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Credenciales incorrectas. Verifique correo y contraseña.'
        }), 400

@auth_bp.route('/status', methods=['GET'])
def status():
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(Usuario, user_id)
        if user:
            return jsonify({
                'isAuthenticated': True,
                'user': {
                    'id': user.id,
                    'nombre': user.nombre,
                    'email': user.email,
                    'rol': user.rol
                }
            })
    return jsonify({'isAuthenticated': False}), 200

@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Sesión cerrada correctamente.'})
