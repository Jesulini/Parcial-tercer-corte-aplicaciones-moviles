import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User 
} from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);

  async login(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const user = result.user;
      const usuario = { uid: user.uid, email: user.email };
      localStorage.setItem('usuario', JSON.stringify(usuario));
      return user;
    } catch (error: any) {
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  async register(email: string, password: string): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = result.user;
      const usuario = { uid: user.uid, email: user.email };
      localStorage.setItem('usuario', JSON.stringify(usuario));
      return user;
    } catch (error: any) {
      throw new Error(this.getFirebaseErrorMessage(error.code));
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    localStorage.removeItem('usuario');
  }

  getCurrentUser(): { uid: string; email: string | null } | null {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  private getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido';
      case 'auth/user-disabled':
        return 'La cuenta ha sido deshabilitada';
      case 'auth/user-not-found':
        return 'No existe un usuario con ese correo';
      case 'auth/wrong-password':
        return 'La contraseña es incorrecta';
      case 'auth/email-already-in-use':
        return 'El correo ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos, intenta más tarde';
      default:
        return 'Error de autenticación, intenta nuevamente';
    }
  }
}
