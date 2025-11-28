import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NavController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(100),
          this.noWhitespaceValidator
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(30),
          this.noWhitespaceValidator
        ]
      ],
    });
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.showToast('Por favor corrige los errores antes de continuar', 'danger');
      return;
    }

    const { email, password } = this.loginForm.value;
    try {
      await this.authService.login(email, password);
      this.showToast('Login exitoso', 'success');
      this.navCtrl.navigateRoot('/home');
    } catch (error: any) {
      this.showToast(error.message || 'Error al iniciar sesión', 'danger');
    }
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
      cssClass: 'custom-toast'
    });
    toast.present();
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return controlName === 'email' ? 'El correo es obligatorio' : 'La contraseña es obligatoria';
    }
    if (control.errors['email']) {
      return 'Formato de correo inválido';
    }
    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `No puede superar ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    if (control.errors['whitespace']) {
      return 'No puede contener solo espacios';
    }
    return 'Campo inválido';
  }

  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }
}
