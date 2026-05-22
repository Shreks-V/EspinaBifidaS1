import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private _debug = false;

  get debug(): boolean {
    return this._debug;
  }

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<{ debug: boolean }>(`${environment.apiUrl}/config`)
      );
      this._debug = cfg.debug ?? false;
    } catch {
      this._debug = false;
    }
  }
}
