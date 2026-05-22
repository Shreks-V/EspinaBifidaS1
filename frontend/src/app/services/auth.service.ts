import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserInfo {
  id_usuario: number;
  correo: string;
  nombre: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<UserInfo | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  private getToken(): string | null {
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;

    const legacyToken = localStorage.getItem('token');
    if (legacyToken) {
      sessionStorage.setItem('token', legacyToken);
      localStorage.removeItem('token');
      return legacyToken;
    }
    return null;
  }

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((res) => {
        sessionStorage.setItem('token', res.access_token);
        localStorage.removeItem('token');
        this.loadUser();
      })
    );
  }

  loadUser(): void {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userSubject.next({
          id_usuario: payload.id_usuario,
          correo: payload.sub,
          nombre: payload.nombre || payload.sub,
          rol: payload.rol || 'OPERATIVO',
        });
      } catch {
        this.logout();
      }
    }
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('preregistro_token');
    localStorage.removeItem('token');
    this.userSubject.next(null);
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getUser(): UserInfo | null {
    return this.userSubject.value;
  }

  isAdmin(): boolean {
    const rol = (this.userSubject.value?.rol || '').toUpperCase();
    return rol === 'ADMINISTRADOR' || rol === 'ADMIN';
  }

  hasRole(...roles: string[]): boolean {
    const rol = (this.userSubject.value?.rol || '').toUpperCase();
    return roles.map(r => r.toUpperCase()).includes(rol);
  }
}
