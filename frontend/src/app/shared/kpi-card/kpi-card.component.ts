import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card" [style.border-left-color]="color">
      <div class="kpi-header">
        <div class="kpi-icon" [style.background]="iconBg" [innerHTML]="safeIcon"></div>
        <span class="kpi-trend" *ngIf="trend" [class.up]="trendUp" [class.down]="!trendUp">
          {{ trend }}
        </span>
      </div>
      <div class="kpi-value">{{ value }}</div>
      <div class="kpi-label">{{ label }}</div>
    </div>
  `,
  styles: [`
    .kpi-card {
      background: var(--blanco);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow);
      border: 1px solid var(--gris-200);
      border-left: 4px solid;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .kpi-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--blanco);
    }
    .kpi-icon ::ng-deep svg {
      width: 22px;
      height: 22px;
    }
    .kpi-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--gris-900);
      line-height: 1;
      margin-bottom: 4px;
    }
    .kpi-label {
      font-size: 14px;
      color: var(--gris-500);
      font-weight: 500;
    }
    .kpi-trend {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .kpi-trend.up {
      background: #f0fdf4;
      color: #15803d;
    }
    .kpi-trend.down {
      background: #fef2f2;
      color: #b91c1c;
    }
  `],
})
export class KpiCardComponent implements OnChanges {
  @Input() value: string | number = '0';
  @Input() label = '';
  @Input() color = 'var(--azul-oscuro)';
  @Input() iconBg = 'var(--azul-oscuro)';
  @Input() iconSvg = '';
  @Input() trend = '';
  @Input() trendUp = true;

  safeIcon = '';

  ngOnChanges() {
    this.safeIcon = this.iconSvg || '';
  }
}
