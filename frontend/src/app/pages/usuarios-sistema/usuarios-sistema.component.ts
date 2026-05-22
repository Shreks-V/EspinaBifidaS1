import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

const ROLES = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
  { value: 'ENCARGADO_ALMACEN', label: 'Encargado de Almacén' },
  { value: 'DOCTOR', label: 'Doctor' },
];

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENCARGADO_ALMACEN: 'Encargado de Almacén',
  DOCTOR: 'Doctor',
};

@Component({
  selector: 'app-usuarios-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './usuarios-sistema.component.html',
})
export class UsuariosSistemaComponent implements OnInit {
  usuarios: any[] = [];
  loading = false;
  globalMsg = '';
  globalMsgType: 'success' | 'error' = 'success';

  roles = ROLES;

  // Form modal
  showFormModal = false;
  editMode = false;
  editTarget: any = null;
  formData: any = {};
  formLoading = false;
  formError = '';

  // Reset modal
  showResetModal = false;
  resetTarget: any = null;
  resetNueva = '';
  resetLoading = false;
  resetError = '';
  resetSuccess = false;

  get currentUserId(): number {
    return this.auth.getUser()?.id_usuario ?? -1;
  }

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.api.listarUsuariosSistema().subscribe({
      next: (data) => { this.usuarios = data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  initials(u: any): string {
    const n = (u.nombre || '').charAt(0).toUpperCase();
    const a = (u.apellido_paterno || '').charAt(0).toUpperCase();
    return n + a || 'US';
  }

  rolLabel(rol: string): string {
    return ROL_LABELS[rol] ?? rol;
  }

  openCreateModal(): void {
    this.editMode = false;
    this.editTarget = null;
    this.formData = { nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', rol: 'RECEPCIONISTA', estatus: 'ACTIVO', contrasena: '' };
    this.formError = '';
    this.showFormModal = true;
  }

  openEditModal(u: any): void {
    this.editMode = true;
    this.editTarget = u;
    this.formData = { nombre: u.nombre || '', apellido_paterno: u.apellido_paterno || '', apellido_materno: u.apellido_materno || '', rol: u.rol || 'RECEPCIONISTA', estatus: u.estatus || 'ACTIVO' };
    this.formError = '';
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  submitForm(): void {
    this.formError = '';
    if (!this.formData.nombre?.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.editMode && !this.formData.correo?.trim()) { this.formError = 'El correo es obligatorio.'; return; }
    if (!this.editMode && (!this.formData.contrasena || this.formData.contrasena.length < 8)) { this.formError = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (!this.formData.rol) { this.formError = 'Selecciona un rol.'; return; }

    this.formLoading = true;
    const obs = this.editMode
      ? this.api.actualizarUsuarioSistema(this.editTarget.id_usuario, {
          nombre: this.formData.nombre,
          apellido_paterno: this.formData.apellido_paterno || null,
          apellido_materno: this.formData.apellido_materno || null,
          rol: this.formData.rol,
          estatus: this.formData.estatus,
        })
      : this.api.crearUsuarioSistema({
          nombre: this.formData.nombre,
          apellido_paterno: this.formData.apellido_paterno || null,
          apellido_materno: this.formData.apellido_materno || null,
          correo: this.formData.correo,
          rol: this.formData.rol,
          estatus: 'ACTIVO',
          contrasena: this.formData.contrasena,
        });

    obs.subscribe({
      next: () => {
        this.formLoading = false;
        this.showFormModal = false;
        this.showGlobalMsg(this.editMode ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.', 'success');
        this.cargarUsuarios();
      },
      error: (err: any) => {
        this.formLoading = false;
        this.formError = err?.error?.detail ?? 'Error al guardar el usuario.';
      },
    });
  }

  toggleEstatus(u: any): void {
    const nuevoEstatus = u.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.api.actualizarUsuarioSistema(u.id_usuario, {
      nombre: u.nombre,
      apellido_paterno: u.apellido_paterno || null,
      apellido_materno: u.apellido_materno || null,
      rol: u.rol,
      estatus: nuevoEstatus,
    }).subscribe({
      next: () => {
        u.estatus = nuevoEstatus;
        this.showGlobalMsg(`Usuario ${nuevoEstatus === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`, 'success');
      },
      error: (err: any) => {
        this.showGlobalMsg(err?.error?.detail ?? 'Error al cambiar el estatus.', 'error');
      },
    });
  }

  openResetModal(u: any): void {
    this.resetTarget = u;
    this.resetNueva = '';
    this.resetError = '';
    this.resetSuccess = false;
    this.showResetModal = true;
  }

  closeResetModal(): void {
    this.showResetModal = false;
  }

  submitReset(): void {
    this.resetError = '';
    if (!this.resetNueva || this.resetNueva.length < 8) {
      this.resetError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    this.resetLoading = true;
    this.api.adminResetContrasena(this.resetTarget.id_usuario, { contrasena_nueva: this.resetNueva }).subscribe({
      next: () => { this.resetLoading = false; this.resetSuccess = true; },
      error: (err: any) => { this.resetLoading = false; this.resetError = err?.error?.detail ?? 'Error al restablecer la contraseña.'; },
    });
  }

  private showGlobalMsg(msg: string, type: 'success' | 'error'): void {
    this.globalMsg = msg;
    this.globalMsgType = type;
    setTimeout(() => { this.globalMsg = ''; }, 4000);
  }
}
