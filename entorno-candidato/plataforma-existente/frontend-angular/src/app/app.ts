import { Component, signal } from '@angular/core';
import { Ficha } from './ficha';
import { Reporte } from './reporte';

@Component({
  selector: 'app-root',
  imports: [Reporte, Ficha],
  template: `
    <main>
      <h1>Costos por abogado</h1>
      <nav>
        <button [class.activa]="pantalla() === 'reporte'" (click)="pantalla.set('reporte')">Reporte</button>
        <button [class.activa]="pantalla() === 'ficha'" (click)="pantalla.set('ficha')">Ficha</button>
      </nav>
      <section>
        @if (pantalla() === 'reporte') { <app-reporte /> } @else { <app-ficha /> }
      </section>
    </main>
  `,
  styles: `
    main { max-width: 56rem; margin: 0 auto; padding: 2.5rem 1.5rem; font-family: system-ui, sans-serif; color: #0f172a; }
    h1 { font-size: 1.25rem; font-weight: 600; }
    nav { display: flex; gap: .5rem; border-bottom: 1px solid #e2e8f0; margin-top: 1rem; }
    button { background: none; border: none; padding: .5rem 1rem; font-size: .875rem; color: #64748b; cursor: pointer; }
    button.activa { color: #0f172a; font-weight: 600; border-bottom: 2px solid #0f172a; }
    section { margin-top: 1.5rem; }
  `,
})
export class App {
  readonly pantalla = signal<'reporte' | 'ficha'>('reporte');
}
