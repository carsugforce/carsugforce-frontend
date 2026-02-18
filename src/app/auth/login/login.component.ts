import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from "@angular/material/icon";
import { ThemeService } from '../../core/service/theme.service';
import { AuthService } from '../../core/service/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinner,
    MatIcon
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  error = '';
  //testing only
 /* form = this.fb.group({
    email: ['owner@carsug-force.com', [Validators.required, Validators.email]],
    password: ['SuperAdmin123$', [Validators.required]]
  });*/

   form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  logoLight = '/assets/logo.png';
  logoDark = '/assets/logo2.png';
  logo = this.logoLight;
  showPass = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private theme: ThemeService 
  ) {}
  
  ngOnInit() {
    const isDark = document.body.classList.contains('dark-theme');
    this.logo = isDark ? this.logoDark : this.logoLight;
  }
    isDarkMode = false;

   


  submit() {
    if (this.form.invalid || this.loading) return;

    const { email, password } = this.form.value;
    if (!email || !password) return;

    this.loading = true;
    this.error = '';

    this.auth.login(email.toLowerCase(), password).subscribe({
      next: () => {
        this.loading = false;

        const dark = this.auth.getDarkModeFromToken();

        this.theme.setDark(dark);
        document.body.classList.toggle('dark-theme', dark);

        setTimeout(() => window.dispatchEvent(new Event('theme-changed')), 50);

        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
      error: () => {
        this.loading = false;
        this.error = 'Credenciales inválidas';
      }
    });

  }

}
