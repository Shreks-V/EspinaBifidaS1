import { Component, Input, OnChanges } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-module-card',
  standalone: true,
  imports: [RouterModule],
  template: `
    <a [routerLink]="route" class="module-card" [style.--accent]="accentColor">
      <div class="module-icon" [innerHTML]="safeIcon"></div>
      <div class="module-info">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
  `,
  styles: [`
    .module-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--blanco);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow);
      border: 1px solid var(--gris-200);
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--accent, var(--azul-oscuro));
    }
    .module-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: var(--accent, var(--azul-oscuro));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--blanco);
    }
    .module-icon ::ng-deep svg {
      width: 26px;
      height: 26px;
    }
    .module-info {
      flex: 1;
    }
    .module-info h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--gris-900);
      margin-bottom: 4px;
    }
    .module-info p {
      font-size: 13px;
      color: var(--gris-500);
    }
    .arrow {
      color: var(--gris-400);
      flex-shrink: 0;
    }
  `],
})
export class ModuleCardComponent implements OnChanges {
  @Input() title = '';
  @Input() description = '';
  @Input() route = '';
  @Input() iconSvg = '';
  @Input() accentColor = 'var(--azul-oscuro)';

  safeIcon = '';

  ngOnChanges() {
    this.safeIcon = this.iconSvg || '';
  }
}
