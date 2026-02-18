import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, NgChartsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {

  today = new Date();

  metrics = [
    { label: 'Ventas totales', value: '$125,430', delta: '+12% vs pasado', trend: 'up' },
    { label: 'Tickets', value: '3,218', delta: '+4% nuevos', trend: 'up' },
    { label: 'Churn', value: '2.1%', delta: '-0.3 pts', trend: 'down' }
  ];

  lineData: ChartConfiguration<'line'>['data'] = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Ingresos',
        data: [18, 22, 19, 24, 28, 31, 27],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        borderWidth: 2
      }
    ]
  };

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true, ticks: { display: true } },
      x: { grid: { display: false } }
    }
  };

  barData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Sedán', 'SUV', 'Pickup', 'Híbrido', 'Eléctrico'],
    datasets: [
      {
        label: 'Órdenes',
        data: [42, 51, 33, 18, 27],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(248, 113, 113, 0.8)'
        ],
        borderRadius: 10,
        borderSkipped: false
      }
    ]
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } }
    }
  };

  private themeListener: any;

  constructor() {}

  ngOnInit() {
    this.themeListener = (event: any) => {
      const newTheme = event.detail;
      
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('theme-changed', this.themeListener);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('theme-changed', this.themeListener);
    }
  }

  /** Obtener variable CSS */
  getVar(v: string) {
    return getComputedStyle(document.body).getPropertyValue(v).trim();
  }

}
