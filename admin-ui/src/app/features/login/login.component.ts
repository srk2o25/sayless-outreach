import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgIf } from "@angular/common";
import { Router } from "@angular/router";
import { catchError, of } from "rxjs";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "cad-login",
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = "";
  protected password = "";
  protected submitting = false;
  protected error = false;

  protected onSubmit(): void {
    this.submitting = true;
    this.error = false;
    this.authService
      .login(this.email, this.password)
      .pipe(
        catchError(() => of(false))
      )
      .subscribe((ok: boolean) => {
        this.submitting = false;
        if (ok) {
          void this.router.navigateByUrl("/batches");
        } else {
          this.error = true;
        }
      });
  }
}
