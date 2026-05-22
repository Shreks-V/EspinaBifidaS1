import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent {
  form = { contrasena_actual: '', contrasena_nueva: '', confirmar: '' };
  showActual = false;
  showNueva = false;
  showConfirm = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  get userName(): string {
    return this.auth.getUser()?.nombre ?? '-';
  }
  get userEmail(): string { return this.auth.getUser()?.correo ?? '-'; }
  get userRol(): string {
    const roles: Record<string, string> = {
      ADMINISTRADOR: 'Administrador', RECEPCIONISTA: 'Recepcionista',
      ENCARGADO_ALMACEN: 'Encargado de Almacén', DOCTOR: 'Doctor',
    };
    const rol = this.auth.getUser()?.rol ?? '';
    return roles[rol] ?? rol;
  }

  constructor(private api: ApiService, private auth: AuthService) {}

  cambiarContrasena(): void {
    if (this.form.contrasena_nueva !== this.form.confirmar) return;
    if (this.form.contrasena_nueva.length < 8) return;

    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.api.cambiarContrasena({
      contrasena_actual: this.form.contrasena_actual,
      contrasena_nueva: this.form.contrasena_nueva,
    }).subscribe({
      next: () => {
        this.successMsg = 'Contraseña actualizada correctamente.';
        this.form = { contrasena_actual: '', contrasena_nueva: '', confirmar: '' };
        this.saving = false;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail ?? 'Error al actualizar la contraseña. Verifica tu contraseña actual.';
        this.saving = false;
      },
    });
  }
}
