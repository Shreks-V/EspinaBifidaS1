import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p class="text-sm text-slate-600">&copy; 2026 Asociaci&oacute;n de Espina B&iacute;fida. Todos los derechos reservados.</p>
        <button class="text-sm text-slate-600 hover:text-slate-900 underline cursor-pointer bg-transparent border-none">Privacidad</button>
      </div>
    </footer>
  `,
  styles: []
})
export class FooterComponent {}
